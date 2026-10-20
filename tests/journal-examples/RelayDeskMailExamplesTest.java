import org.simplejavamail.api.mailer.config.ConnectionPoolConfig;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.email.config.OpenPgpSigningConfig;
import org.simplejavamail.api.email.config.OpenPgpReceiveConfig;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailRecipientDisposition;
import org.simplejavamail.api.mailer.MailRetryDisposition;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.SmtpConnectionReport;
import org.simplejavamail.api.mailer.SmtpServerResponse;
import org.simplejavamail.converter.EmailConverter;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.config.ConfigLoader;
import org.simplejavamail.mailer.internal.MailSendOutcomeImpl;
import org.simplejavamail.mailer.internal.MailSubmissionReceiptImpl;

import java.time.Instant;
import java.time.Duration;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.simplejavamail.api.mailer.MailRetryDisposition.*;
import static org.simplejavamail.api.mailer.MailRecipientDisposition.*;

/** Offline preparation and synthetic result checks. Only public test keys; no SMTP connections. */
public final class RelayDeskMailExamplesTest {
    private static int checks;

    public static void main(String[] args) throws Exception {
        SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
        mailerSettingsTest(mail);
        UUID conversation = UUID.fromString("e5039a2b-37b3-4200-9cb1-a7d3530b70a7");
        UUID firstAttempt = UUID.fromString("25a4f7f0-6f52-4bd6-9d0b-8b623ce50e62");
        UUID retryAttempt = UUID.fromString("4125c98a-22d4-4c0d-b233-5c8d4862f1fa");
        Email first = reply(mail, conversation, firstAttempt);
        Email retry = reply(mail, conversation, retryAttempt);

        check(first.getId().equals("<" + firstAttempt + "@mail.relaydesk.com>"),
            "Fix the Message-ID before submission");
        check(!first.getId().equals(retry.getId()), "Retries get distinct attempt IDs");
        check(first.getFromRecipient().getAddress().equals("support@kestrel-outfitters.com"),
            "Use the approved customer sender");
        check(first.getReplyToRecipients().size() == 1, "One approved reply route");
        check(first.getReplyToRecipients().get(0).getAddress().equals(
            "ticket+" + conversation + "@replies.kestrel-outfitters.com"),
            "Human replies identify the conversation");
        check(first.getReplyToRecipients().equals(retry.getReplyToRecipients()),
            "A retry stays in the same conversation");
        check(first.getBounceToRecipient().getAddress().equals(
            "bounce+" + firstAttempt + "@bounces.kestrel-outfitters.com"),
            "Bounces identify the original attempt");
        check(!first.getBounceToRecipient().equals(retry.getBounceToRecipient()),
            "Do not confuse a retry's bounce with the previous attempt");
        check(first.getRecipients().get(0).getAddress().equals("shopper@recipient.invalid"),
            "Preserve the intended recipient");
        check(first.getPlainText().equals("Your parcel is waiting at the collection point."),
            "Preserve the reply content");
        check(Boolean.TRUE.equals(first.getSendingToAcceptedRecipients()),
            "The support reply explicitly permits partial submission");
        EmailPopulatingBuilder allRecipients = mail.emailBuilder().copying(first);
        allRecipients.withSmtpDeliveryOptions(allRecipients.getSmtpDeliveryOptions().toBuilder()
                .withSendingToAcceptedRecipients(false).build());
        check(Boolean.FALSE.equals(allRecipients.buildEmail().getSendingToAcceptedRecipients()),
            "Another message can require all recipients without rebuilding its Mailer");

        DeliveryStatusNotification dsn = first.getDeliveryStatusNotification();
        check(dsn.getReturnOption() == DeliveryStatusNotification.ReturnOption.HEADERS_ONLY,
            "Request headers rather than another copy of the content");
        check(dsn.getNotifyOptions().size() == 2
            && dsn.getNotifyOptions().contains(DeliveryStatusNotification.NotifyOption.FAILURE)
            && dsn.getNotifyOptions().contains(DeliveryStatusNotification.NotifyOption.DELAY),
            "Request failure and delay reports, not read receipts");
        check(dsn.getEnvelopeId().equals(firstAttempt.toString()), "DSN envelope ID identifies the attempt");

        Instant now = Instant.parse("2026-09-27T10:00:00Z");
        for (MailSubmissionStatus status : MailSubmissionStatus.values()) {
            // Internal assembly is test-only; the downloadable application example consumes the public read interfaces.
            MailSubmissionReceipt receipt = MailSubmissionReceiptImpl.builder()
                .emailId("<effective@recipient.invalid>").submittedAt(now).status(status)
                .recipientResults(status == MailSubmissionStatus.ACCEPTED
                    ? List.of(new MailRecipientResult("shopper@recipient.invalid", "shopper@recipient.invalid", ACCEPTED, null, null))
                    : Collections.emptyList())
                .retryDisposition(status == MailSubmissionStatus.ACCEPTED ? DO_NOT_RETRY : CALLER_POLICY_REQUIRED).build();
            boolean accepted = status == MailSubmissionStatus.ACCEPTED;
            MailSendOutcome outcome = MailSendOutcomeImpl.builder().initialMessageId(first.getId()).effectiveMessageId(receipt.getEmailId())
                .requestedAt(now).readyAt(now).startedAt(now).completedAt(now).successful(accepted).submissionReceipt(receipt)
                .failure(accepted ? null : new IllegalStateException("Synthetic " + status)).build();
            assertRecordedUnchanged(first.getId(), outcome);
        }

        MailSendOutcome preparationFailure = MailSendOutcomeImpl.builder().initialMessageId(first.getId())
            .requestedAt(now).completedAt(now).failure(new IllegalArgumentException("Synthetic preparation failure")).build();
        assertRecordedUnchanged(first.getId(), preparationFailure);
        check(preparationFailure.getStartedAt() == null, "A pre-send failure has no start timestamp");
        Feedback noReceiptFeedback = new Feedback();
        RelayDeskMailExamples.presentOutcome(preparationFailure, noReceiptFeedback);
        check(noReceiptFeedback.updates == 0, "No receipt does not invent submission facts for the ticket");
        submissionTests(first);
        protectionTests(mail, Path.of(args[0]));
        receiptTests();
        probeTests();
        System.out.println("Passed " + checks + " RelayDesk message/observer checks; no mail sent.");
    }

    private static void mailerSettingsTest(SimpleJavaMail mail) throws Exception {
        try (Mailer mailer = RelayDeskMailExamples.createMailer(mail, UUID.randomUUID(),
                "smtp.relaydesk.invalid", "test-user", "test-password",
                3, 6, 7, "kestrel-eu-test", 12, Duration.ofSeconds(1), outcome -> { }, Runnable::run)) {
            check(mailer.getOperationalConfig().getConnectionPoolMaxSize() == 3,
                "Use the selected per-relay connection limit");
            check(mailer.getOperationalConfig().getThreadPoolSize() == 6,
                "Worker count need not equal connection count");
            check(mailer.getOperationalConfig().getAsyncQueueConfig().getCapacity() == 7,
                "Use the selected local waiting capacity");
            check(mailer.getOperationalConfig().getAsyncQueueConfig().getOverflowPolicy()
                    == org.simplejavamail.api.mailer.config.AsyncQueueOverflowPolicy.REJECT,
                "Reject excess local work rather than growing the queue");
            check(mailer.getOperationalConfig().getRecipientRateLimit().getCount() == 12,
                "Use the assigned per-instance recipient rate, not the connection count");
            check(mailer.getOperationalConfig().getRecipientRateLimit().getPeriod().equals(Duration.ofSeconds(1)),
                "Keep the customer's counting period explicit");
            check(mailer.getOperationalConfig().getRateLimitGroup().equals("kestrel-eu-test"),
                "Customer and region identify the local shared rate group");
            check(!mailer.getOperationalConfig().isRateLimitBurstsAllowed(),
                "Recovery does not release the whole window as one burst");
            check(mailer.getSession().getProperty("mail.smtp.sendpartial") == null,
                "Partial sending belongs to the Email, not a blanket provider property");
        }
    }

    private static void protectionTests(SimpleJavaMail mail, Path resources) throws Exception {
        byte[] publicKey = Files.readAllBytes(resources.resolve("openpgpjs/public-key.asc"));
        byte[] privateKey = Files.readAllBytes(resources.resolve("openpgpjs/private-key.asc"));
        OpenPgpSigningConfig signing = OpenPgpSigningConfig.builder().secretKeyRing(privateKey)
                .passphrase("openpgpjs-fixture-passphrase").build();
        List<String> lookups = new ArrayList<>();
        RelayDeskMailExamples.ApprovedOpenPgpKeys keys = new RelayDeskMailExamples.ApprovedOpenPgpKeys() {
            public OpenPgpSigningConfig requireSigningConfig(String customer) {
                if (!customer.equals("kestrel")) throw new IllegalStateException("Tenant not approved");
                return signing;
            }
            public byte[] requireRecipientKey(String customer, String mailbox) {
                if (!customer.equals("kestrel") || mailbox.startsWith("missing")) {
                    throw new IllegalStateException("No approved key for this tenant/recipient");
                }
                lookups.add(mailbox);
                return publicKey;
            }
        };
        Email defaults = mail.emailBuilder().startingBlank().withRecipients(mail.recipientBuilder()
                .withAddress("archive@recipient.invalid").withType(jakarta.mail.Message.RecipientType.BCC).build())
                .buildEmail();
        try (Mailer mailer = mail.mailerBuilder().withSMTPServer("127.0.0.1", 1)
                .withConnectionPoolConfig(ConnectionPoolConfig.builder().withCoreSize(0).build()).withEmailDefaults(defaults).buildMailer()) {
            Email reply = mail.emailBuilder().startingBlank().from("support@kestrel-outfitters.com")
                    .withRecipients(mail.recipientBuilder().withAddress("buyer@recipient.invalid").withType(jakarta.mail.Message.RecipientType.TO).build(),
                            mail.recipientBuilder().withAddress("accounts@recipient.invalid").withType(jakarta.mail.Message.RecipientType.CC).build())
                    .withSubject("Wholesale support").withPlainText("Confidential test reply\r\n").buildEmail();
            Email protectedReply = RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", reply, keys);
            check(lookups.containsAll(List.of("buyer@recipient.invalid", "accounts@recipient.invalid", "archive@recipient.invalid")),
                    "Resolve keys for every effective recipient, including configured Bcc");
            check(protectedReply.getOpenPgpSigningConfig() == signing, "Use the approved tenant signing key");
            check(reply.getOpenPgpEncryptionConfig() == null, "Do not mutate ordinary support replies");
            byte[] encrypted = mailer.rehearse(protectedReply).getEmlBytes();
            OpenPgpReceiveConfig receiving = OpenPgpReceiveConfig.builder().addVerificationKeyRing(publicKey)
                    .addDecryptionKeyRing(privateKey, "openpgpjs-fixture-passphrase").build();
            Email decoded = EmailConverter.emlToEmailWithOpenPgp(new ByteArrayInputStream(encrypted), receiving);
            check(decoded.getPlainText().trim().equals("Confidential test reply"), "The example really encrypts a readable PGP/MIME message");
            check(decoded.getOriginalOpenPgpDetails().getSignatureStatus().name().equals("VALID"),
                    "The protected reply has a valid signature");
            boolean tenantBlocked = false;
            try { RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "juniper", reply, keys); }
            catch (IllegalStateException expected) { tenantBlocked = true; }
            check(tenantBlocked, "Juniper cannot borrow Kestrel's keys");
            Email missing = mail.emailBuilder().copying(reply).clearRecipients()
                    .withRecipients(mail.recipientBuilder().withAddress("missing@recipient.invalid")
                            .withType(jakarta.mail.Message.RecipientType.TO).build()).buildEmail();
            boolean missingBlocked = false;
            try { RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", missing, keys); }
            catch (IllegalStateException expected) { missingBlocked = true; }
            check(missingBlocked, "A missing approved key stops preparation; no plaintext fallback");

            lookups.clear();
            Email redirected = mail.emailBuilder().copying(reply)
                    .withOverrideReceivers(mail.recipientBuilder().withAddress("actual@recipient.invalid")
                            .withType(jakarta.mail.Message.RecipientType.TO).build()).buildEmail();
            Email protectedRedirect = RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", redirected, keys);
            check(lookups.equals(List.of("actual@recipient.invalid")), "Key selection follows the actual SMTP envelope");
            check(mailer.rehearse(protectedRedirect).getEnvelopeRecipients().equals(lookups),
                    "Do not lose the approved envelope while copying the message for protection");
        }
    }

    private static void receiptTests() {
        List<MailRecipientResult> recipients = List.of(
                recipient("buyer@recipient.invalid", ACCEPTED, 250),
                recipient("warehouse@recipient.invalid", VALID_UNSENT, 450),
                recipient("former-contact@recipient.invalid", INVALID, 550));
        MailSubmissionReceipt partial = MailSubmissionReceiptImpl.builder().emailId("<test@relaydesk.com>").submittedAt(Instant.now())
                .status(MailSubmissionStatus.PARTIALLY_ACCEPTED).recipientResults(recipients).retryDisposition(SAFE_TO_RETRY_UNACCEPTED).build();
        Feedback feedback = new Feedback();
        Instant now = Instant.now();
        RelayDeskMailExamples.presentOutcome(MailSendOutcomeImpl.builder().initialMessageId("<initial@relaydesk.com>")
                .effectiveMessageId(partial.getEmailId()).requestedAt(now).readyAt(now).startedAt(now).completedAt(now)
                .submissionReceipt(partial).failure(new IllegalStateException("Synthetic partial send")).build(), feedback);
        check(feedback.updates == 3, "A failed attempt can still supply its captured receipt to the ticket");
        check(feedback.recipients.equals(recipients), "Ticket retains each recipient's independent result");
        check(feedback.advice == SAFE_TO_RETRY_UNACCEPTED && feedback.candidates.equals(List.of(recipients.get(1))),
                "Only the temporary, unsubmitted recipient is a retry candidate");
        for (MailRetryDisposition advice : List.of(DUPLICATE_RISK, CALLER_POLICY_REQUIRED, DO_NOT_RETRY)) {
            RelayDeskMailExamples.presentResult(MailSubmissionReceiptImpl.builder().emailId("<test@relaydesk.com>").submittedAt(Instant.now())
                    .status(MailSubmissionStatus.UNKNOWN).recipientResults(recipients).retryDisposition(advice).build(), feedback);
            check(feedback.advice == advice && feedback.candidates.isEmpty(), "No automatic candidates for " + advice);
        }
        for (Long maximum : new Long[]{10_000_000L, 12_000_000L, 13_000_000L, null}) {
            RelayDeskMailExamples.presentResult(MailSubmissionReceiptImpl.builder().emailId("<test@relaydesk.com>").submittedAt(Instant.now())
                    .status(MailSubmissionStatus.REJECTED).recipientResults(List.of()).retryDisposition(CALLER_POLICY_REQUIRED)
                    .messageSize(12_000_000L).serverMaximumMessageSize(maximum).build(), feedback);
            check(feedback.messageSize.equals(12_000_000L) && java.util.Objects.equals(feedback.maximumSize, maximum),
                    "Keep size facts independently of status, including unknown maximum");
        }
        RelayDeskMailExamples.presentResult(partial, feedback);
        check(feedback.messageSize == null && feedback.maximumSize == null, "Unknown size is not zero or unlimited");
    }

    private static MailRecipientResult recipient(String address, MailRecipientDisposition disposition, int code) {
        return new MailRecipientResult(address, address, disposition, true, new SmtpServerResponse(code, null));
    }

    private static void submissionTests(Email reply) {
        MailSend<MailSubmissionReceipt> handle = new MailSend<>(new CompletableFuture<>(), () -> {});
        Mailer.Async async = (Mailer.Async) Proxy.newProxyInstance(Mailer.class.getClassLoader(),
                new Class<?>[]{Mailer.Async.class}, (proxy, method, args) -> {
                    check(method.getName().equals("sendMail") && args.length == 1 && args[0] == reply,
                            "Submit the prepared reply unchanged through SJM's async API");
                    return handle;
                });
        Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[]{Mailer.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("async")) return async;
                    throw new AssertionError("Unexpected call: " + method.getName());
                });
        check(RelayDeskMailExamples.submitReply(mailer, reply) == handle,
                "Return SJM's send handle without blocking or creating another attempt");
        check(!handle.getCompletion().isDone(), "Submitting does not wait for the send result");
    }

    private static void probeTests() {
        for (boolean authenticated : new boolean[]{true, false}) {
            SmtpConnectionReport report = SmtpConnectionReport.builder().host("127.0.0.1").port(1).protocol("smtp")
                    .startedAt(Instant.now()).completedAt(Instant.now()).supported(true).connected(authenticated)
                    .authenticationRequested(true).authenticated(authenticated).warnings(List.of()).build();
            Mailer.Sync sync = (Mailer.Sync) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[]{Mailer.Sync.class},
                    (proxy, method, args) -> {
                        check(method.getName().equals("probeConnection") && args.length == 1 && Boolean.TRUE.equals(args[0]),
                                "Credential check must request authentication, never send a message");
                        return report;
                    });
            Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[]{Mailer.class},
                    (proxy, method, args) -> {
                        if (method.getName().equals("sync")) return sync;
                        throw new AssertionError("Unexpected call: " + method.getName());
                    });
            boolean passed = false;
            try { passed = RelayDeskMailExamples.checkCredentials(mailer) == report; }
            catch (IllegalStateException expected) { }
            check(passed == authenticated, "Failed credential checks must keep the route paused");
        }
    }

    private static final class Feedback implements RelayDeskMailExamples.TicketFeedback {
        int updates;
        List<MailRecipientResult> recipients, candidates;
        MailRetryDisposition advice;
        Long messageSize, maximumSize;
        public void showRecipients(List<MailRecipientResult> values) { updates++; recipients = values; }
        public void showRetryAdvice(MailRetryDisposition value, List<MailRecipientResult> values) { updates++; advice = value; candidates = values; }
        public void showMessageSize(Long size, Long maximum) { updates++; messageSize = size; maximumSize = maximum; }
    }

    private static Email reply(SimpleJavaMail mail, UUID conversation, UUID attempt) {
        return RelayDeskMailExamples.prepareKestrelReply(mail.emailBuilder().startingBlank()
            .withRecipients(mail.recipientBuilder().withAddress("shopper@recipient.invalid").withType(jakarta.mail.Message.RecipientType.TO).build())
            .withSubject("Re: Your parcel")
            .withPlainText("Your parcel is waiting at the collection point."), conversation, attempt);
    }

    private static void assertRecordedUnchanged(String expectedId, MailSendOutcome outcome) {
        AtomicReference<String> storedId = new AtomicReference<>();
        AtomicReference<MailSendOutcome> storedOutcome = new AtomicReference<>();
        RelayDeskMailExamples.observerFor((id, result) -> {
            storedId.set(id);
            storedOutcome.set(result);
        }).onMailSendCompleted(outcome);
        check(expectedId.equals(storedId.get()), "Correlate with the initial, not effective, Message-ID");
        check(outcome == storedOutcome.get(), "Preserve the complete outcome for the application to interpret");
    }

    private static void check(boolean condition, String description) {
        checks++;
        if (!condition) {
            throw new AssertionError(description);
        }
    }
}
