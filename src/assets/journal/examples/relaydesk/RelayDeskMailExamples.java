import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.mailer.MailSendObserver;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.config.AsyncQueueOverflowPolicy;
import org.simplejavamail.api.mailer.config.TransportStrategy;

import java.time.Duration;
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
    public static Mailer createMailer(SimpleJavaMail mail, UUID clusterKey,
            String smtpHost, String username, String password,
            MailSendObserver observer, Executor observerWorkers) {
        return mail.mailerBuilder()
            .withSMTPServer(smtpHost, 587, username, password)
            .withTransportStrategy(TransportStrategy.SMTP_TLS)
            .trustingAllHosts(false)
            .trustingSSLHosts() // clear any host-specific trust exceptions
            .verifyingServerIdentity(true)
            .withClusterKey(clusterKey)
            .withConnectionPoolCoreSize(0) // no need to stay connected while quiet
            .withConnectionPoolMaxSize(2) // at most two connections per relay pool
            .withConnectionPoolExpireAfterMillis(30_000) // retire idle connections
            .withConnectionPoolClaimTimeoutMillis(2_000) // don't wait forever for a pool
            .withMailSendTimeout(Duration.ofSeconds(20)) // bound each send attempt
            .withThreadPoolSize(2)
            .withAsyncQueueCapacity(4) // a small buffer, not the customer's backlog
            .withAsyncQueueOverflowPolicy(AsyncQueueOverflowPolicy.REJECT)
            .withMailSendObserver(observer, observerWorkers)
            .buildMailer();
    }

    // Register the attempt and its Message-ID before submitting the prepared Email.
    public static MailSendObserver observerFor(AttemptResults attemptResults) {
        return outcome -> attemptResults.record(outcome.getInitialMessageId(), outcome);
    }

    // Kestrel-specific example: these domains and return addresses must be approved
    // and connected to the incoming-mail integration before using them for real mail.
    // The builder already contains the intended recipient, content and attachments.
    public static Email prepareKestrelReply(EmailPopulatingBuilder replyEmailBuilder,
            UUID conversationToken, UUID attemptToken) {
        return replyEmailBuilder
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
}
