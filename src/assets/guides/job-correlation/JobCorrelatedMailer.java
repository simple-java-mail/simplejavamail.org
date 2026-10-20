import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendHandlers;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendProgress;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailerRegularBuilder;

import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Executor;

/**
 * Application-owned correlation for individual asynchronous sends through one shared Mailer.
 * This helper owns the Mailer and its handler factory. The application owns the supplied executor.
 * It deliberately exposes no lazy-batch operation: caller ThreadLocals do not propagate to its execution thread.
 */
public final class JobCorrelatedMailer implements AutoCloseable {
    private final ThreadLocal<String> submittingJob = new ThreadLocal<>();
    private final Mailer mailer;

    public JobCorrelatedMailer(MailerRegularBuilder<?> freshBuilder, JobEvents events,
            Executor resultObserverExecutor) {
        Objects.requireNonNull(events, "events");
        Objects.requireNonNull(resultObserverExecutor, "resultObserverExecutor");
        mailer = Objects.requireNonNull(freshBuilder, "freshBuilder")
                .withSendHandlersFactory(observationId -> {
                    // Individual-send factories run now, on the thread calling sendAsync().
                    final String jobId = Objects.requireNonNull(submittingJob.get(),
                            "Submit individual sends through JobCorrelatedMailer.sendAsync");
                    // These closures retain values. They never read submittingJob later.
                    return MailSendHandlers.builder()
                            .withProgressObserver(progress -> events.onProgress(jobId, observationId, progress))
                            .withResultObserver(outcome -> events.onOutcome(jobId, observationId, outcome),
                                    resultObserverExecutor)
                            .build();
                })
                .buildMailer();
    }

    public MailSend<MailSubmissionReceipt> sendAsync(String jobId, Email email) {
        Objects.requireNonNull(jobId, "jobId");
        Objects.requireNonNull(email, "email");
        final String previousJob = submittingJob.get();
        submittingJob.set(jobId);
        try {
            return mailer.async().sendMail(email);
        } finally {
            // Scope ends when submission returns, not when the asynchronous send completes.
            if (previousJob == null) {
                submittingJob.remove();
            } else {
                submittingJob.set(previousJob);
            }
        }
    }

    @Override
    public void close() throws Exception {
        mailer.close();
    }

    /** Thread-safe application callbacks; executor handoff does not promise durable storage. */
    public interface JobEvents {
        void onProgress(String jobId, UUID observationId, MailSendProgress progress);

        void onOutcome(String jobId, UUID observationId, MailSendOutcome outcome);
    }
}
