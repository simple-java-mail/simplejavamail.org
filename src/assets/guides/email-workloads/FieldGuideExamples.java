import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.mailer.MailSendDiagnostics;
import org.simplejavamail.api.mailer.SmtpConnectionReport;
import org.simplejavamail.api.mailer.config.AsyncQueueOverflowPolicy;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailerRegularBuilder;

/** Small call examples, not a queue implementation. No method runs automatically. */
public final class FieldGuideExamples {
    private FieldGuideExamples() { }

    static MailSubmissionReceipt submitOne(Mailer mailer, Email email) {
        return mailer.sync().sendMail(email);
    }

    static void submitInvoiceBatch(Mailer mailer, Iterable<Email> invoices) {
        mailer.sync().sendMailsInSimpleBatch(invoices);
    }

    static Mailer boundedPool(MailerRegularBuilder smtpBuilder) {
        return smtpBuilder
            .withThreadPoolSize(4)                 // four active asynchronous jobs
            .withAsyncQueueCapacity(20)            // twenty more may wait in memory
            .withAsyncQueueOverflowPolicy(AsyncQueueOverflowPolicy.REJECT)
            .withConnectionPoolCoreSize(0)         // no permanently warm connections
            .withConnectionPoolMaxSize(2)          // at most two pooled connections
            .buildMailer();
    }

    static Mailer pacedMailer(MailerRegularBuilder smtpBuilder) {
        return smtpBuilder
            .withMessageRateLimit(30, Duration.ofMinutes(1))
            .withRateLimitGroup("transactional-account")
            .withRateLimitBurstsAllowed(false)
            .buildMailer();
    }

    static Mailer customerMailer(
            MailerRegularBuilder customerSmtpBuilder, UUID customerClusterKey) {
        return customerSmtpBuilder
            .withClusterKey(customerClusterKey)
            .withConnectionPoolCoreSize(0)
            .withConnectionPoolMaxSize(2)
            .buildMailer();
    }

    static List<MailRecipientResult> recipientsSafeToRetry(
            MailSubmissionReceipt receipt) {
        switch (receipt.getRetryDisposition()) {
            case SAFE_TO_RETRY_ALL:
            case SAFE_TO_RETRY_UNACCEPTED:
                return receipt.getRetryableRecipients();
            default:
                return Collections.emptyList();
        }
    }

    static void verifyReplacement(Mailer replacementMailer) {
        SmtpConnectionReport report = replacementMailer.sync().probeConnection(true);
        if (!report.isSuccessful() || !report.isAuthenticated()) {
            throw new IllegalStateException("Replacement SMTP credentials not verified");
        }
    }

    static long preparedBytes(Mailer mailer, Email email) {
        return mailer.rehearse(email).getEncodedSize();
    }

    static Optional<Boolean> advertisesSmtpUtf8(SmtpConnectionReport report) {
        return report.getEffectiveCapabilities()
            .map(capabilities -> capabilities.supports("SMTPUTF8"));
    }

    static Email allowPartialReply(SimpleJavaMail mail, Email supportReply) {
        return mail.emailBuilder().copying(supportReply)
            .withSendingToAcceptedRecipients(true)
            .buildEmail();
    }

    static Mailer observedMailer(MailerRegularBuilder smtpBuilder,
                                 Consumer<MailSendDiagnostics> recordTimings) {
        return smtpBuilder
            .withMailSendObserver(outcome ->
                outcome.getDiagnostics().ifPresent(recordTimings))
            .buildMailer();
    }

    static void stopSending(
            Runnable stopAndAwaitDispatch,
            Mailer mailer,
            ExecutorService observationWorkers) throws Exception {
        stopAndAwaitDispatch.run(); // application stops claiming and handing off jobs
        mailer.close();             // drain sends and observer handoff attempts
        observationWorkers.shutdown();
        if (!observationWorkers.awaitTermination(30, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Result-writing callbacks still pending");
        }
    }
}
