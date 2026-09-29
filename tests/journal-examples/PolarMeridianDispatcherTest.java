import org.h2.jdbcx.JdbcDataSource;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.email.Recipient;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.mailer.MailRehearsal;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendObserver;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendRejectedException;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.config.ConfigLoader;
import org.simplejavamail.api.mailer.config.Pkcs12Config;
import org.simplejavamail.converter.EmailConverter;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;

import static org.simplejavamail.api.mailer.AsyncQueueRejectionReason.QUEUE_FULL;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.ACCEPTED;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.PARTIALLY_ACCEPTED;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.UNKNOWN;
import static org.simplejavamail.recipient.RecipientBuilder.to;
import static org.simplejavamail.recipient.RecipientBuilder.cc;
import static org.simplejavamail.recipient.RecipientBuilder.bcc;
import static org.simplejavamail.api.email.config.DeliveryStatusNotification.NotifyOption.FAILURE;
import static org.simplejavamail.api.email.config.DeliveryStatusNotification.NotifyOption.NEVER;

/** Focused example tests. Fake SMTP; in-memory H2, not a PostgreSQL integration test. */
public final class PolarMeridianDispatcherTest {
    private static final Instant NOW = Instant.parse("2026-09-26T10:00:00Z");
    private static volatile OffsetDateTime databaseNow = NOW.atOffset(ZoneOffset.UTC);
    private static int checks;
    private static Path testResources;

    public static OffsetDateTime databaseTime() {
        return databaseNow;
    }

    public static void main(String[] args) throws Exception {
        testResources = Path.of(args[1]);
        dispatchTests();
        quotaTests(Path.of(args[0]));
        System.out.println("Passed " + checks + " dispatcher/accounting checks; no mail sent.");
    }

    private static void dispatchTests() throws Exception {
        Fixture denied = new Fixture();
        denied.permissionFailure = true;
        denied.dispatch();
        check(denied.composed == 0 && denied.sent == 0 && denied.archived == 0 && denied.acquired == 0
                && denied.held == 1, "Denied permission must stop before composition/quota/archive/send");

        Fixture invalidCertificate = new Fixture();
        invalidCertificate.compositionFailure = true;
        invalidCertificate.dispatch();
        check(invalidCertificate.sent == 0 && invalidCertificate.acquired == 0
                && invalidCertificate.held == 1, "A certificate failure cannot fall back to plaintext");

        Fixture invalidFinalMessage = new Fixture();
        invalidFinalMessage.finalCheckFailure = true;
        invalidFinalMessage.dispatch();
        check(invalidFinalMessage.sent == 0 && invalidFinalMessage.acquired == 0
                && invalidFinalMessage.held == 1, "Final envelope checks precede accounting");

        Fixture orderConfirmation = new Fixture();
        orderConfirmation.orderConfirmation = true;
        orderConfirmation.dispatch();
        check(orderConfirmation.sent == 1 && orderConfirmation.archived == 1 && orderConfirmation.submitted == 1,
                "The concrete order confirmation goes through rehearsal, archive and submission");
        check("leonie-order".equals(orderConfirmation.loadedConfirmationRequestId),
                "compose(job) loads the claimed request before delegating to the order-confirmation helper");
        Email confirmation = EmailConverter.emlToEmail(new ByteArrayInputStream(orderConfirmation.submittedBytes));
        check("Confirmation for order PM-2048".equals(confirmation.getSubject()),
                "The subject identifies the stored order");
        check(("We've received your replacement-parts order PM-2048. "
                + "You can view its details in the ordering portal.").equals(confirmation.getPlainText().trim()),
                "The body uses the stored order number");
        check("Polar Meridian Orders".equals(confirmation.getFromRecipient().getName())
                && "orders@polarmeridian.com".equals(confirmation.getFromRecipient().getAddress()),
                "The composer selects the approved order-confirmation sender");
        check(confirmation.getRecipients().size() == 1
                && "Leonie".equals(confirmation.getRecipients().get(0).getName())
                && "leonie@partner.com".equals(confirmation.getRecipients().get(0).getAddress())
                && orderConfirmation.countedRecipients == 1,
                "The order's customer becomes the envelope recipient counted for quota");
        check("bounces@polarmeridian.com".equals(orderConfirmation.evidence.envelopeSender),
                "The concrete confirmation includes the explicit SMTP envelope sender");
        check(Arrays.equals(orderConfirmation.evidence.getEmlBytes().orElseThrow(), orderConfirmation.submittedBytes),
                "The order-confirmation retention rule preserves the submitted bytes");

        Fixture deniedConfirmation = new Fixture();
        deniedConfirmation.orderConfirmation = true;
        deniedConfirmation.permissionFailure = true;
        deniedConfirmation.dispatch();
        check(deniedConfirmation.loadedConfirmationRequestId == null && deniedConfirmation.sent == 0,
                "Denied permission prevents loading or composing the confirmation");

        Fixture limited = new Fixture();
        limited.allowed = false;
        limited.dispatch();
        check(limited.sent == 0 && limited.archived == 0 && limited.deferred == 1
                && NOW.plusSeconds(1).equals(limited.notBefore), "An exhausted share defers without SMTP");

        Fixture queueFull = new Fixture();
        queueFull.sendFailure = new CompletionException(new MailSendRejectedException(QUEUE_FULL));
        queueFull.dispatch();
        check(queueFull.refunded == 1 && queueFull.deferred == 1 && queueFull.held == 0
                && NOW.plusSeconds(5).equals(queueFull.notBefore), "QUEUE_FULL refunds and defers");
        check(queueFull.reports.isEmpty(), "A handled queue rejection is not a persistence failure");

        Fixture successful = new Fixture();
        successful.dispatch();
        check(successful.sent == 1 && successful.archived == 1 && successful.submitted == 1
                && successful.completed == 1, "Confirmed acceptance completes the request");
        check(successful.quotaAttempt.equals(successful.archiveAttempt)
                && successful.archiveAttempt.equals(successful.sentEmail.getId()),
                "Quota, archive and submission must use the same attempt ID");
        MailSubmissionReceipt archivedReceipt = new MailSubmissionReceipt(successful.archiveAttempt,
                null, NOW, ACCEPTED, Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
        MailSendOutcome archivedOutcome = new MailSendOutcome(successful.archiveAttempt,
                successful.archiveAttempt, NOW, NOW, NOW, NOW, true, false, archivedReceipt, null);
        MailSendObserver observationSink = outcome ->
                successful.archive.recordOutcome(outcome.getInitialMessageId(), outcome);
        observationSink.onMailSendCompleted(archivedOutcome);
        observationSink.onMailSendCompleted(archivedOutcome);
        check(successful.outcomes.size() == 1 && successful.outcomes.get(successful.archiveAttempt) == archivedOutcome,
                "The observer updates the inserted attempt through the same archive adapter without duplicating it");
        check(successful.countedRecipients == 2, "Accounting includes both recipients");
        check(Arrays.equals(successful.evidence.getEmlBytes().orElseThrow(), successful.submittedBytes),
                "Archived bytes are identical to the exact email handed to the send API");
        check(successful.sentEmail.getBounceToRecipient().getAddress().equals("bounces@polarmeridian.com"),
                "Exact submission retains the explicit SMTP sender");
        check(successful.sentEmail.isTlsRequiredForOnwardDelivery(), "Exact submission retains REQUIRETLS");
        check(successful.sentEmail.getDeliveryStatusNotification().getEnvelopeId().equals("test-envelope-id"),
                "Exact submission retains ENVID");
        check(successful.sentEmail.getDeliveryStatusNotification().getReturnOption()
                        == DeliveryStatusNotification.ReturnOption.HEADERS_ONLY,
                "Exact submission retains DSN return policy");
        check(successful.sentEmail.getOverrideReceivers().get(0).getDeliveryStatusNotificationNotifyOptions()
                        .equals(Collections.singleton(NEVER)), "Recipient-specific DSN survives exact conversion");
        byte[] mutableCopy = successful.evidence.getEmlBytes().orElseThrow();
        mutableCopy[0] ^= 1;
        check(Arrays.equals(successful.evidence.getEmlBytes().orElseThrow(), successful.submittedBytes),
                "Archive callers cannot mutate retained EML through an accessor");

        Fixture protectedMessage = new Fixture();
        protectedMessage.smime = true;
        protectedMessage.dispatch();
        check(protectedMessage.sent == 1 && Arrays.equals(
                        protectedMessage.evidence.getEmlBytes().orElseThrow(), protectedMessage.submittedBytes),
                "Signing/encryption precedes archiving: " + protectedMessage.heldReason);
        Email decrypted = EmailConverter.emlToEmail(new ByteArrayInputStream(protectedMessage.submittedBytes),
                Pkcs12Config.builder().pkcs12Store(testResources.resolve("pkcs12/smime_keystore.pkcs12"))
                        .storePassword("letmein").keyAlias("smime_test_user_alias_rsa").keyPassword("letmein").build());
        check(decrypted.getPlainText().trim().equals("Never sent"),
                "Retained protected EML remains decryptable with the test recipient's key");
        check(Boolean.TRUE.equals(decrypted.getOriginalSmimeDetails().getSmimeSignatureValid()),
                "SMTP line termination and exact submission preserve the S/MIME signature");

        for (PolarMeridianDispatcher.Workload workload : PolarMeridianDispatcher.Workload.values()) {
            Fixture metadataOnly = new Fixture();
            metadataOnly.retainContent = false;
            metadataOnly.workload = workload;
            metadataOnly.dispatch();
            check(metadataOnly.sent == 1 && metadataOnly.evidence.getEmlBytes().isEmpty(),
                    "Metadata-only " + workload + " sends do not retain message content");
        }
        Fixture retainedUrgent = new Fixture();
        retainedUrgent.workload = PolarMeridianDispatcher.Workload.URGENT;
        retainedUrgent.dispatch();
        check(retainedUrgent.evidence.getEmlBytes().isPresent(),
                "Retention is an approved message rule, not inferred from priority");

        Fixture override = new Fixture();
        override.overrideRecipients = true;
        override.dispatch();
        check(override.sent == 1 && override.countedRecipients == 3,
                "Quota counts the configured transport envelope: " + override.countedRecipients + "; " + override.heldReason);
        check(override.sentEmail.getOverrideReceivers().size() == 3,
                "Exact send preserves all actual envelope recipient occurrences");

        for (String header : List.of("Bcc", "Resent-Bcc", "Content-Length")) {
            Fixture unsafe = new Fixture();
            unsafe.unsafeHeader = header;
            unsafe.dispatch();
            check(unsafe.sent == 0 && unsafe.archived == 0 && unsafe.acquired == 0 && unsafe.held == 1,
                    "Reject unsafe " + header + " without silently rewriting archived content");
        }
        Fixture missingSender = new Fixture();
        missingSender.missingSender = true;
        missingSender.dispatch();
        check(missingSender.sent == 0 && missingSender.held == 1,
                "Do not claim an exact SMTP envelope while leaving the sender to provider defaults");

        Fixture nonCanonical = new Fixture();
        nonCanonical.nonCanonical = true;
        nonCanonical.dispatch();
        check(nonCanonical.sent == 0 && nonCanonical.held == 1,
                "Hold non-canonical exact EML; do not normalize protected bytes after preparation");

        for (MailSubmissionStatus status : List.of(PARTIALLY_ACCEPTED, UNKNOWN)) {
            Fixture uncertain = new Fixture();
            uncertain.status = status;
            uncertain.dispatch();
            check(uncertain.held == 1 && uncertain.deferred == 0 && uncertain.refunded == 0
                    && uncertain.completed == 0, status + " is not blindly retried or refunded");
        }

        Fixture noReceipt = new Fixture();
        noReceipt.noReceipt = true;
        noReceipt.dispatch();
        check(noReceipt.held == 1 && noReceipt.submitted == 0, "No receipt is not SMTP acceptance");

        Fixture failedArchive = new Fixture();
        failedArchive.archiveFailure = true;
        failedArchive.dispatch();
        check(failedArchive.sent == 0 && failedArchive.held == 1,
                "A failed archive insert prevents submission");

        Fixture rejectedCallback = new Fixture();
        rejectedCallback.completions = task -> { throw new RejectedExecutionException("full"); };
        rejectedCallback.dispatch();
        check(rejectedCallback.sent == 1 && rejectedCallback.reports.size() == 1
                && rejectedCallback.deferred == 0, "Rejected result callbacks are reported, not retried");

        Fixture failedUpdate = new Fixture();
        failedUpdate.updateFailure = true;
        failedUpdate.dispatch();
        check(failedUpdate.reports.size() == 1 && failedUpdate.deferred == 0,
                "A queue write failure cannot turn acceptance into a retry");
    }

    private static void quotaTests(Path schema) throws Exception {
        JdbcDataSource database = new JdbcDataSource();
        database.setURL("jdbc:h2:mem:polar;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
        try (Connection connection = database.getConnection(); Statement sql = connection.createStatement()) {
            sql.execute("CREATE ALIAS clock_timestamp FOR 'PolarMeridianDispatcherTest.databaseTime'");
            String source = Files.readString(schema).replaceAll("(?m)--.*$", "");
            for (String statement : source.split(";")) {
                if (!statement.isBlank()) sql.execute(statement);
            }
            sql.execute("UPDATE mail_dispatch_limit SET per_second = 3, per_24_hours = 5 " +
                    "WHERE workload = 'BULK'");
        }
        JdbcDispatchLimits first = new JdbcDispatchLimits(database);
        JdbcDispatchLimits second = new JdbcDispatchLimits(database);
        String sendingQuotaGroup = "eu-application-mail";
        PolarMeridianDispatcher.Workload bulk = PolarMeridianDispatcher.Workload.BULK;
        PolarMeridianDispatcher.Workload urgent = PolarMeridianDispatcher.Workload.URGENT;
        check(first.tryAcquire("a", "order-a", sendingQuotaGroup, bulk, 2), "First multi-recipient charge fits");
        check(!second.tryAcquire("b", "order-b", sendingQuotaGroup, bulk, 2), "Another instance sees the same rate use");
        check(second.tryAcquire("u", "login", sendingQuotaGroup, urgent, 1), "A full bulk share does not block urgent");
        first.complete("a");
        databaseNow = databaseNow.plusSeconds(2);
        check(second.tryAcquire("c", "order-c", sendingQuotaGroup, bulk, 3), "Rate replenishes while daily use remains");
        databaseNow = databaseNow.plusSeconds(2);
        check(!first.tryAcquire("d", "order-d", sendingQuotaGroup, bulk, 1), "Daily ceiling still blocks after rate clears");
        first.releaseUnsent("c");
        check(first.tryAcquire("e", "order-e", sendingQuotaGroup, bulk, 3), "Known-unsent work can release its charge");

        databaseNow = databaseNow.plusHours(25);
        check(!second.tryAcquire("f", "order-f", sendingQuotaGroup, bulk, 3),
                "Unfinished charges do not disappear when their admission is old");
        first.complete("e");
        check(!second.tryAcquire("g", "order-g", sendingQuotaGroup, bulk, 3),
                "Completion retains the charge for a new 24-hour period");
        databaseNow = databaseNow.plusHours(24).plusSeconds(1);
        check(second.tryAcquire("h", "order-h", sendingQuotaGroup, bulk, 3),
                "Completed charges eventually leave the rolling window");

        try (Connection connection = database.getConnection(); Statement sql = connection.createStatement()) {
            sql.execute("DELETE FROM mail_dispatch_charge");
            sql.execute("UPDATE mail_dispatch_limit SET per_second = 5, per_24_hours = 100 " +
                    "WHERE workload = 'BULK'");
        }
        ExecutorService racers = Executors.newFixedThreadPool(12);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> attempts = new ArrayList<>();
        try {
            for (int i = 0; i < 24; i++) {
                final int attempt = i;
                attempts.add(racers.submit(() -> {
                    start.await();
                    JdbcDispatchLimits independent = new JdbcDispatchLimits(database);
                    return independent.tryAcquire("race-" + attempt, "job-" + attempt, sendingQuotaGroup, bulk, 1);
                }));
            }
            start.countDown();
            int accepted = 0;
            for (Future<Boolean> attempt : attempts) if (attempt.get()) accepted++;
            check(accepted == 5, "Concurrent connections must not spend the same five places");
            try (Connection connection = database.getConnection(); Statement sql = connection.createStatement();
                    ResultSet count = sql.executeQuery("SELECT COUNT(*) FROM mail_dispatch_charge")) {
                count.next();
                check(count.getInt(1) == 5, "Rejected transactions leave no charge");
            }
        } finally {
            racers.shutdownNow();
        }

        boolean unknownGroup = false;
        try {
            first.tryAcquire("bad-group", "job", "unapproved", bulk, 1);
        } catch (Exception expected) {
            unknownGroup = true;
        }
        check(unknownGroup, "Unknown sending quota groups fail closed");

        boolean oversizedMessage = false;
        try {
            first.tryAcquire("too-many", "job", sendingQuotaGroup, bulk, 6);
        } catch (IllegalArgumentException expected) {
            oversizedMessage = true;
        }
        check(oversizedMessage, "A message that can never fit must not be deferred forever");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
        checks++;
    }

    /** In-memory substitute for the article's application-owned request repository. */
    private interface OrderConfirmationStore {
        OrderConfirmationComposer.OrderConfirmation loadByRequestId(String requestId);
    }

    private static final class Fixture {
        final SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
        final List<Throwable> reports = new ArrayList<>();
        boolean permissionFailure, compositionFailure, finalCheckFailure, archiveFailure, updateFailure, noReceipt;
        boolean allowed = true;
        boolean retainContent = true, overrideRecipients, missingSender, nonCanonical, smime, orderConfirmation;
        String unsafeHeader;
        PolarMeridianDispatcher.Workload workload = PolarMeridianDispatcher.Workload.ROUTINE;
        Throwable sendFailure;
        Throwable heldReason;
        MailSubmissionStatus status = ACCEPTED;
        Executor completions = Runnable::run;
        int composed, acquired, refunded, completed, archived, sent, held, deferred, submitted, countedRecipients;
        String quotaAttempt, archiveAttempt, loadedConfirmationRequestId;
        Instant notBefore;
        Email sentEmail;
        byte[] submittedBytes;
        PolarMeridianDispatcher.AttemptEvidence evidence;
        final Map<String, MailSendOutcome> outcomes = new ConcurrentHashMap<>();
        final PolarMeridianDispatcher.AttemptArchive archive = new PolarMeridianDispatcher.AttemptArchive() {
            public void insertAttempt(String id, String request, PolarMeridianDispatcher.AttemptEvidence record) {
                if (archiveFailure) throw new IllegalStateException("archive unavailable");
                archived++; archiveAttempt = id; evidence = record;
            }
            public void recordOutcome(String id, MailSendOutcome outcome) {
                if (!id.equals(archiveAttempt)) throw new IllegalStateException("Attempt was not inserted");
                outcomes.put(id, outcome);
            }
        };

        void dispatch() throws Exception {
            Mailer renderingMailer = mail.mailerBuilder().withSMTPServer("127.0.0.1", 1)
                    .withConnectionPoolCoreSize(0).buildMailer();
            PolarMeridianDispatcher.Job job = new PolarMeridianDispatcher.Job(
                    "leonie-order", "unique-claim-token", workload);
            Mailer.Async async = (Mailer.Async) Proxy.newProxyInstance(Mailer.class.getClassLoader(),
                    new Class<?>[]{Mailer.Async.class}, (proxy, method, args) -> {
                        if (!method.getName().equals("sendMail")) throw new UnsupportedOperationException();
                        check(archived == 1, "Archive must precede the send call");
                        sent++;
                        sentEmail = (Email) args[0];
                        submittedBytes = renderingMailer.rehearse(sentEmail).getEmlBytes();
                        CompletableFuture<MailSubmissionReceipt> result = new CompletableFuture<>();
                        if (sendFailure != null) result.completeExceptionally(sendFailure);
                        else result.complete(noReceipt ? null : new MailSubmissionReceipt(
                                sentEmail.getId(), null, NOW, status,
                                Collections.emptyList(), Collections.emptyList(), Collections.emptyList()));
                        return new MailSend<>(result, () -> {});
                    });
            Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(),
                    new Class<?>[]{Mailer.class}, (proxy, method, args) -> {
                        if (method.getName().equals("async")) return async;
                        if (method.getName().equals("rehearse")) {
                            MailRehearsal snapshot = renderingMailer.rehearse((Email) args[0]);
                            if (!nonCanonical) return snapshot;
                            byte[] truncated = Arrays.copyOf(snapshot.getEmlBytes(), snapshot.getEmlBytes().length - 1);
                            return new MailRehearsal(snapshot.getEffectiveEmail(), truncated, snapshot.getEmailId(),
                                    snapshot.getEnvelopeSender(), snapshot.getEnvelopeRecipients(), true);
                        }
                        throw new UnsupportedOperationException(method.getName());
                    });
            PolarMeridianDispatcher.MailOutbox outbox = new PolarMeridianDispatcher.MailOutbox() {
                public Optional<PolarMeridianDispatcher.Job> claimNextDue(
                        PolarMeridianDispatcher.Workload workload, Instant now) { return Optional.of(job); }
                public void defer(PolarMeridianDispatcher.Job claimed, Instant when) {
                    deferred++; notBefore = when;
                }
                public void markSubmitted(PolarMeridianDispatcher.Job claimed, MailSubmissionReceipt receipt) {
                    if (updateFailure) throw new IllegalStateException("database write failed");
                    submitted++;
                }
                public void holdForReview(PolarMeridianDispatcher.Job claimed, Throwable reason) { held++; heldReason = reason; }
            };
            OrderConfirmationComposer orderConfirmationComposer = new OrderConfirmationComposer(mail);
            OrderConfirmationStore orderConfirmations = requestId -> {
                loadedConfirmationRequestId = requestId;
                if (!"leonie-order".equals(requestId)) throw new IllegalArgumentException("Unknown confirmation request");
                return new OrderConfirmationComposer.OrderConfirmation("PM-2048", "Leonie", "leonie@partner.com");
            };
            PolarMeridianDispatcher.MessagePreparation preparation = new PolarMeridianDispatcher.MessagePreparation() {
                public void checkPermissions(PolarMeridianDispatcher.Job claimed) {
                    if (permissionFailure) throw new IllegalStateException("application suspended");
                }
                public PolarMeridianDispatcher.ComposedMail compose(PolarMeridianDispatcher.Job claimed) {
                    composed++;
                    if (compositionFailure) throw new IllegalStateException("recipient_certificate_expired");
                    if (orderConfirmation) {
                        OrderConfirmationComposer.OrderConfirmation confirmation =
                                orderConfirmations.loadByRequestId(claimed.requestId);
                        return orderConfirmationComposer.composeOrderConfirmation(
                                confirmation, mailer, "eu-application-mail");
                    }
                    EmailPopulatingBuilder builder = mail.emailBuilder().startingBlank()
                            .from("service@polarmeridian.com")
                            .withRecipients(new Recipient("Leonie", "leonie@partner.com",
                                    jakarta.mail.Message.RecipientType.TO, null, List.of(NEVER)),
                                    cc("Service", "service@partner.com"))
                            .withSubject("Test only").withPlainText("Never sent\r\n")
                            .withTlsRequiredForOnwardDelivery()
                            .withDeliveryStatusNotification(DeliveryStatusNotification.ReturnOption.HEADERS_ONLY, FAILURE)
                            .fixingEnvelopeId("test-envelope-id");
                    if (!missingSender) builder.withBounceTo("bounces@polarmeridian.com");
                    if (smime) builder
                            .signWithSmime(testResources.resolve("pkcs12/smime_keystore.pkcs12"),
                                    "letmein", "smime_test_user_alias_rsa", "letmein", null)
                            .encryptWithSmime(testResources.resolve("pkcs12/smime_test_user.pem.standard.crt"), null, null);
                    if (overrideRecipients) builder.withOverrideReceivers(List.of(
                            to(null, "actual-one@partner.com"), to(null, "actual-two@partner.com"),
                            to(null, "actual-three@partner.com")));
                    if ("Bcc".equals(unsafeHeader)) builder.withRecipients(bcc(null, "hidden@partner.com"));
                    else if (unsafeHeader != null) builder.withHeader(unsafeHeader,
                            "Content-Length".equals(unsafeHeader) ? "10" : "hidden@partner.com");
                    return new PolarMeridianDispatcher.ComposedMail(mailer, "eu-application-mail", builder.buildEmail(),
                            retainContent ? PolarMeridianDispatcher.Retention.EXACT_EML
                                    : PolarMeridianDispatcher.Retention.METADATA_ONLY);
                }
                public void checkFinalMessage(PolarMeridianDispatcher.Job claimed, Mailer selected, MailRehearsal rehearsal) {
                    if (finalCheckFailure) throw new IllegalStateException("unapproved recipient");
                }
            };
            PolarMeridianDispatcher.SendLimits limits = new PolarMeridianDispatcher.SendLimits() {
                public boolean tryAcquire(String id, String request, String sendingQuotaGroup,
                        PolarMeridianDispatcher.Workload workload, int recipientCount) {
                    acquired++; quotaAttempt = id; countedRecipients = recipientCount; return allowed;
                }
                public void complete(String id) { completed++; }
                public void releaseUnsent(String id) { refunded++; }
            };
            PolarMeridianDispatcher dispatcher = new PolarMeridianDispatcher(mail, outbox, preparation,
                    limits, archive, completions, reports::add, Clock.fixed(NOW, ZoneOffset.UTC));
            try {
                dispatcher.dispatchPending(job.workload);
            } finally {
                dispatcher.stopAndAwait();
                renderingMailer.close();
            }
        }
    }
}
