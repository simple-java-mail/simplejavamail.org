import org.h2.jdbcx.JdbcDataSource;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendRejectedException;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.api.mailer.Mailer;

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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
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

/** Focused example tests. Fake SMTP; in-memory H2, not a PostgreSQL integration test. */
public final class PolarMeridianDispatcherTest {
    private static final Instant NOW = Instant.parse("2026-09-26T10:00:00Z");
    private static volatile OffsetDateTime databaseNow = NOW.atOffset(ZoneOffset.UTC);
    private static int checks;

    public static OffsetDateTime databaseTime() {
        return databaseNow;
    }

    public static void main(String[] args) throws Exception {
        dispatchTests();
        quotaTests(Path.of(args[0]));
        System.out.println("Passed " + checks + " dispatcher/accounting checks; no mail sent.");
    }

    private static void dispatchTests() throws Exception {
        Fixture denied = new Fixture();
        denied.permissionFailure = true;
        denied.dispatch();
        check(denied.sent == 0 && denied.archived == 0 && denied.acquired == 0
                && denied.held == 1, "Denied permission must stop before quota/archive/send");

        Fixture invalidCertificate = new Fixture();
        invalidCertificate.renderFailure = true;
        invalidCertificate.dispatch();
        check(invalidCertificate.sent == 0 && invalidCertificate.acquired == 0
                && invalidCertificate.held == 1, "A certificate failure cannot fall back to plaintext");

        Fixture invalidFinalMessage = new Fixture();
        invalidFinalMessage.finalCheckFailure = true;
        invalidFinalMessage.dispatch();
        check(invalidFinalMessage.sent == 0 && invalidFinalMessage.acquired == 0
                && invalidFinalMessage.held == 1, "Final envelope checks precede accounting");

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
        check(successful.countedRecipients == 2, "Accounting includes both recipients");

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
        String scope = "eu-application-mail";
        PolarMeridianDispatcher.Workload bulk = PolarMeridianDispatcher.Workload.BULK;
        PolarMeridianDispatcher.Workload urgent = PolarMeridianDispatcher.Workload.URGENT;
        check(first.tryAcquire("a", "order-a", scope, bulk, 2), "First multi-recipient charge fits");
        check(!second.tryAcquire("b", "order-b", scope, bulk, 2), "Another instance sees the same rate use");
        check(second.tryAcquire("u", "login", scope, urgent, 1), "A full bulk share does not block urgent");
        first.complete("a");
        databaseNow = databaseNow.plusSeconds(2);
        check(second.tryAcquire("c", "order-c", scope, bulk, 3), "Rate replenishes while daily use remains");
        databaseNow = databaseNow.plusSeconds(2);
        check(!first.tryAcquire("d", "order-d", scope, bulk, 1), "Daily ceiling still blocks after rate clears");
        first.releaseUnsent("c");
        check(first.tryAcquire("e", "order-e", scope, bulk, 3), "Known-unsent work can release its charge");

        databaseNow = databaseNow.plusHours(25);
        check(!second.tryAcquire("f", "order-f", scope, bulk, 3),
                "Unfinished charges do not disappear when their admission is old");
        first.complete("e");
        check(!second.tryAcquire("g", "order-g", scope, bulk, 3),
                "Completion retains the charge for a new 24-hour period");
        databaseNow = databaseNow.plusHours(24).plusSeconds(1);
        check(second.tryAcquire("h", "order-h", scope, bulk, 3),
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
                    return independent.tryAcquire("race-" + attempt, "job-" + attempt, scope, bulk, 1);
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

        boolean unknownScope = false;
        try {
            first.tryAcquire("bad-scope", "job", "unapproved", bulk, 1);
        } catch (Exception expected) {
            unknownScope = true;
        }
        check(unknownScope, "Unknown scopes fail closed");

        boolean oversizedMessage = false;
        try {
            first.tryAcquire("too-many", "job", scope, bulk, 6);
        } catch (IllegalArgumentException expected) {
            oversizedMessage = true;
        }
        check(oversizedMessage, "A message that can never fit must not be deferred forever");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
        checks++;
    }

    private static final class Fixture {
        final SimpleJavaMail mail = SimpleJavaMail.fromDefaults();
        final List<Throwable> reports = new ArrayList<>();
        boolean permissionFailure, renderFailure, finalCheckFailure, archiveFailure, updateFailure, noReceipt;
        boolean allowed = true;
        Throwable sendFailure;
        MailSubmissionStatus status = ACCEPTED;
        Executor completions = Runnable::run;
        int acquired, refunded, completed, archived, sent, held, deferred, submitted, countedRecipients;
        String quotaAttempt, archiveAttempt;
        Instant notBefore;
        Email sentEmail;

        void dispatch() throws Exception {
            PolarMeridianDispatcher.Job job = new PolarMeridianDispatcher.Job(
                    "leonie-order", "unique-claim-token", PolarMeridianDispatcher.Workload.ROUTINE);
            Mailer.Async async = (Mailer.Async) Proxy.newProxyInstance(Mailer.class.getClassLoader(),
                    new Class<?>[]{Mailer.Async.class}, (proxy, method, args) -> {
                        if (!method.getName().equals("sendMail")) throw new UnsupportedOperationException();
                        check(archived == 1, "Archive must precede the send call");
                        sent++;
                        sentEmail = (Email) args[0];
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
                public void holdForReview(PolarMeridianDispatcher.Job claimed, Throwable reason) { held++; }
            };
            PolarMeridianDispatcher.MessagePreparation preparation = new PolarMeridianDispatcher.MessagePreparation() {
                public void checkPermissions(PolarMeridianDispatcher.Job claimed) {
                    if (permissionFailure) throw new IllegalStateException("application suspended");
                }
                public PolarMeridianDispatcher.PreparedMail render(PolarMeridianDispatcher.Job claimed) {
                    if (renderFailure) throw new IllegalStateException("recipient_certificate_expired");
                    Email email = mail.emailBuilder().startingBlank()
                            .from("service@polarmeridian.com")
                            .withRecipients(to("Leonie", "leonie@partner.com"), cc("Service", "service@partner.com"))
                            .withSubject("Test only").withPlainText("Never sent").buildEmail();
                    return new PolarMeridianDispatcher.PreparedMail(mailer, "eu-application-mail", email);
                }
                public void checkFinalMessage(PolarMeridianDispatcher.Job claimed, Mailer selected, Email email) {
                    if (finalCheckFailure) throw new IllegalStateException("unapproved recipient");
                }
            };
            PolarMeridianDispatcher.SendLimits limits = new PolarMeridianDispatcher.SendLimits() {
                public boolean tryAcquire(String id, String request, String scope,
                        PolarMeridianDispatcher.Workload workload, int recipients) {
                    acquired++; quotaAttempt = id; countedRecipients = recipients; return allowed;
                }
                public void complete(String id) { completed++; }
                public void releaseUnsent(String id) { refunded++; }
            };
            PolarMeridianDispatcher dispatcher = new PolarMeridianDispatcher(mail, outbox, preparation,
                    limits, (id, request, email) -> {
                        if (archiveFailure) throw new IllegalStateException("archive unavailable");
                        archived++; archiveAttempt = id;
                    }, completions, reports::add, Clock.fixed(NOW, ZoneOffset.UTC));
            try {
                dispatcher.dispatchPending(job.workload);
            } finally {
                dispatcher.stopAndAwait();
            }
        }
    }
}
