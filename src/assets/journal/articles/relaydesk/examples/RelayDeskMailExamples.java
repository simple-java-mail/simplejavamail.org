import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.email.config.OpenPgpEncryptionConfig;
import org.simplejavamail.api.email.config.OpenPgpSigningConfig;
import org.simplejavamail.api.mailer.MailRehearsal;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailRetryDisposition;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendResultObserver;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.SmtpConnectionReport;
import org.simplejavamail.api.mailer.config.AsyncQueueOverflowPolicy;
import org.simplejavamail.api.mailer.config.TransportStrategy;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Executor;

/**
 * Small application helpers from the fictional RelayDesk case study.
 * Targets Simple Java Mail 10.0.0 with its batch module, not the published 9.x API.
 * See README.md for the surrounding application responsibilities and limitations.
 */
public final class RelayDeskMailExamples {
    private RelayDeskMailExamples() {
    }

    // All arguments come from approved configuration, never directly from a request.
    // Reuse the result and close it when its route is safely retired.
    // Rate values are this backend instance's share; the group joins Mailers in one factory.
    public static Mailer createMailer(SimpleJavaMail mail, UUID clusterKey,
            String smtpHost, String username, String password,
            int maxConnectionsPerRelay, int asyncWorkersPerMailer,
            int waitingOperationsPerMailer,
            String sendingRateGroup, int recipientsPerPeriod, Duration sendingRatePeriod,
            MailSendResultObserver observer, Executor observerWorkers) {
        return mail.mailerBuilder()
            .withSMTPServer(smtpHost, 587, username, password)
            .withTransportStrategy(TransportStrategy.SMTP_TLS)
            .trustingAllHosts(false)
            .trustingSSLHosts() // clear any host-specific trust exceptions
            .verifyingServerIdentity(true)
            .withClusterKey(clusterKey)
            .withConnectionPoolCoreSize(0) // no need to stay connected while quiet
            .withConnectionPoolMaxSize(maxConnectionsPerRelay) // within Kestrel's connection allocation
            .withConnectionPoolExpireAfterMillis(30_000) // retire idle connections
            .withConnectionPoolClaimTimeoutMillis(2_000) // don't wait forever for a pool
            .withMailSendTimeout(Duration.ofSeconds(20)) // bound each send attempt
            .withThreadPoolSize(asyncWorkersPerMailer) // operations executing, including preparation
            .withAsyncQueueCapacity(waitingOperationsPerMailer) // waiting in memory, not the durable backlog
            .withAsyncQueueOverflowPolicy(AsyncQueueOverflowPolicy.REJECT) // refuse work when workers and queue are full
            .withRecipientRateLimit(recipientsPerPeriod, sendingRatePeriod) // this instance's share of the customer's rate
            .withRateLimitGroup(sendingRateGroup) // both approved relays spend the same local share
            .withRateLimitBurstsAllowed(false) // spread the recovered backlog instead of releasing a burst
            .withMailSendResultObserver(observer, observerWorkers)
            .buildMailer();
    }

    // Register the attempt and its Message-ID before submitting the prepared Email.
    public static MailSendResultObserver observerFor(AttemptResults attemptResults) {
        return outcome -> attemptResults.record(outcome.getInitialMessageId(), outcome);
    }

    // The dispatcher has admitted the job and durably saved its attempt record.
    // Reuse the customer's approved Mailer, with its completion observer configured.
    public static MailSend<MailSubmissionReceipt> submitReply(Mailer customerMailer, Email reply) {
        return customerMailer.async().sendMail(reply);
    }

    // Destination approval and TLS configuration precede this dedicated, no-message probe.
    // Failure/unsupported inspection keeps onboarding or replacement paused.
    public static SmtpConnectionReport checkCredentials(Mailer mailer) {
        SmtpConnectionReport report = mailer.sync().probeConnection(true);
        if (!report.isSuccessful()) {
            throw new IllegalStateException("SMTP credential check did not pass: " + report);
        }
        return report;
    }

    // Call only for conversations that Kestrel's approved policy marks as protected.
    // Ordinary parcel replies do not acquire an encryption requirement here.
    public static Email protectWholesaleReply(SimpleJavaMail mail, Mailer mailer,
            String customerId, Email reply, ApprovedOpenPgpKeys keys) {
        MailRehearsal rehearsal = mailer.rehearse(reply, false);
        Email effectiveReply = rehearsal.getEffectiveEmail(); // includes defaults and overrides

        OpenPgpEncryptionConfig.OpenPgpEncryptionConfigBuilder encryption =
                OpenPgpEncryptionConfig.builder();
        for (String address : rehearsal.getEnvelopeRecipients()) {
            encryption.addRecipientPublicKeyRing(Objects.requireNonNull(
                    keys.requireRecipientKey(customerId, address), "Missing approved recipient key"));
        }

        EmailPopulatingBuilder protectedReplyBuilder = mail.emailBuilder().copying(effectiveReply)
                .ignoringDefaults().ignoringOverrides() // don't apply them again after key selection
                .signWithOpenPgp(Objects.requireNonNull(keys.requireSigningConfig(customerId)))
                .encryptWithOpenPgp(encryption.build());
        if (!effectiveReply.getOverrideReceivers().isEmpty()) {
            protectedReplyBuilder.withOverrideReceivers(effectiveReply.getOverrideReceivers());
        }
        Email protectedReply = protectedReplyBuilder.buildEmail();
        return protectedReply;
    }

    // Load the saved outcome only after authorizing access to its customer and ticket.
    // An attempt without a receipt still retains its failure/status in the attempt record.
    public static void presentOutcome(MailSendOutcome outcome, TicketFeedback ticket) {
        outcome.getSubmissionReceipt().ifPresent(receipt -> presentResult(receipt, ticket));
    }

    // Render these facts inside the authorized ticket, not in general application logs.
    // This offers evidence for a decision; it does not schedule another send.
    public static void presentResult(MailSubmissionReceipt receipt, TicketFeedback ticket) {
        ticket.showRecipients(receipt.getRecipientResults());
        ticket.showRetryAdvice(receipt.getRetryDisposition(), receipt.getRetryableRecipients());
        ticket.showMessageSize(receipt.getMessageSize(), receipt.getServerMaximumMessageSize());
    }

    // Kestrel-specific example: these domains and return addresses must be approved
    // and connected to the incoming-mail integration before using them for real mail.
    // The builder already contains the intended recipient, content and attachments.
    public static Email prepareKestrelReply(EmailPopulatingBuilder replyEmailBuilder,
            UUID conversationToken, UUID attemptToken) {
        return replyEmailBuilder
            .withSendingToAcceptedRecipients(true) // this reply may proceed for recipients the relay accepts
            .fixingMessageId("<" + attemptToken + "@mail.relaydesk.com>")
            .from("Kestrel Support", "support@kestrel-outfitters.com")
            .withReplyTo("Kestrel Support",
                "ticket+" + conversationToken + "@replies.kestrel-outfitters.com")
            .withBounceTo("bounce+" + attemptToken + "@bounces.kestrel-outfitters.com")
            .withDeliveryStatusNotification(
                DeliveryStatusNotification.ReturnOption.HEADERS_ONLY,
                DeliveryStatusNotification.NotifyOption.FAILURE,
                DeliveryStatusNotification.NotifyOption.DELAY)
            .fixingEnvelopeId(attemptToken.toString())
            .buildEmail();
    }

    /**
     * RelayDesk application adapter, NOT a Simple Java Mail interface.
     * Implementations must support concurrent callbacks, durable result recording
     * and recovery/reporting of failed writes. A recording failure must not resend mail.
     */
    @FunctionalInterface
    public interface AttemptResults {
        void record(String initialMessageId, MailSendOutcome outcome);
    }

    /**
     * Application adapter: verify tenant, mailbox identity, key fingerprint, approval,
     * expiry/revocation and signing authorization. Resolve current keys from protected
     * storage, not a browser-supplied key or automatic key-server lookup. Throw on failure.
     */
    public interface ApprovedOpenPgpKeys {
        OpenPgpSigningConfig requireSigningConfig(String customerId);
        byte[] requireRecipientKey(String customerId, String mailbox);
    }

    /** Application UI adapter. Null sizes mean unknown, never zero or unlimited. */
    public interface TicketFeedback {
        void showRecipients(List<MailRecipientResult> recipients);
        void showRetryAdvice(MailRetryDisposition advice, List<MailRecipientResult> candidates);
        void showMessageSize(Long messageBytes, Long serverMaximumBytes);
    }
}
