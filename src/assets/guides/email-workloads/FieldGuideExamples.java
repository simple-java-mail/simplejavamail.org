import org.simplejavamail.api.mailer.MailSendHandlers;
import java.time.Duration;
import jakarta.mail.Message;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.mailer.MailSendDiagnostics;
import org.simplejavamail.api.mailer.SmtpConnectionReport;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailerRegularBuilder;
import org.simplejavamail.api.mailer.config.FailoverPolicy;
import org.simplejavamail.api.mailer.config.MailSendRetryPolicy;
import org.simplejavamail.api.mailer.config.TransportStrategy;

/** Small call examples, not a queue implementation. No method runs automatically. */
public final class FieldGuideExamples {
    private FieldGuideExamples() { }

    static MailSubmissionReceipt submitOne(Mailer mailer, Email email) {
        return mailer.sync().sendMail(email);
    }

    static Mailer retryingMailer(MailerRegularBuilder<?> smtpBuilder) {
        final MailSendRetryPolicy retryPolicy = MailSendRetryPolicy.builder()
                .withMaximumAttempts(3).withRetryDelay(Duration.ofSeconds(30))
                .withRetryBackoff(2, Duration.ofMinutes(5)).withRetryJitter(0.2)
                .withWaitingCapacity(100)
                .withMaximumMessageSize(32L * 1024 * 1024)
                .withMemoryLimit(128L * 1024 * 1024).build();
        return smtpBuilder.withMailSendRetryPolicy(retryPolicy).buildMailer();
    }

    static Mailer failoverMailer(SimpleJavaMail mail, Mailer alternative) {
        return mail.mailerBuilder()
            .withSMTPServer("primary.example.org", 587)
            .withTransportStrategy(TransportStrategy.SMTP_TLS)
            .withFailoverMailer(alternative, FailoverPolicy.builder()
                .withPrimaryRecheckInterval(Duration.ofSeconds(30))
                .build())
            .buildMailer();
    }

    static void submitInvoiceBatch(Mailer mailer, Iterable<Email> invoices) {
        mailer.sync().sendMailsInSimpleBatch(invoices);
    }

    static Email failoverTemplate(SimpleJavaMail mail) {
        return mail.emailBuilder().startingBlank()
            .withHeader("X-Relay", "secondary")
            .withRecipients(mail.recipientBuilder().withAddress("mail-operations@example.org")
                .withType(Message.RecipientType.BCC).build())
            .buildEmail();
    }

    static FailoverPolicy certificateIncidentPolicy() {
        return FailoverPolicy.builder()
            .withFailoverOnCertificateVerificationFailure(true)
            .withFailoverOnAuthenticationFailure(false)
            .build();
    }

    static Mailer boundedPool(MailerRegularBuilder smtpBuilder) {
        return smtpBuilder
            .withAsyncExecutionConfig(smtpBuilder.getAsyncExecutionConfig().toBuilder()
                .withThreadPoolSize(4) // four active asynchronous jobs
                .withQueueCapacity(20) // twenty more may wait in memory
                .rejectWhenFull()
                .build())
            .withConnectionPoolConfig(smtpBuilder.getConnectionPoolConfig().toBuilder()
                .withCoreSize(0) // no permanently warm connections
                .withMaxSize(2) // at most two pooled connections
                .build())
            .buildMailer();
    }

    static Mailer pacedMailer(MailerRegularBuilder smtpBuilder) {
        return smtpBuilder
            .withSendingLimitsConfig(smtpBuilder.getSendingLimitsConfig().toBuilder()
                .withMessageRateLimit(30, Duration.ofMinutes(1))
                .withRateLimitGroup("transactional-account")
                .withRateLimitBurstsAllowed(false)
                .build())
            .buildMailer();
    }

    static Mailer customerMailer(
            MailerRegularBuilder customerSmtpBuilder, UUID customerClusterKey) {
        return customerSmtpBuilder
            .withConnectionPoolConfig(customerSmtpBuilder.getConnectionPoolConfig().toBuilder()
                .withClusterKey(customerClusterKey)
                .withCoreSize(0)
                .withMaxSize(2)
                .build())
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
        EmailPopulatingBuilder reply = mail.emailBuilder().copying(supportReply);
        return reply
            .withSmtpDeliveryOptions(reply.getSmtpDeliveryOptions().toBuilder()
                .withSendingToAcceptedRecipients(true)
                .build())
            .buildEmail();
    }

    static Mailer observedMailer(MailerRegularBuilder smtpBuilder,
                                 Consumer<MailSendDiagnostics> recordTimings) {
        return smtpBuilder
            .withSendHandlers(MailSendHandlers.builder().withResultObserver(outcome ->
                outcome.getDiagnostics().ifPresent(recordTimings)).build())
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
