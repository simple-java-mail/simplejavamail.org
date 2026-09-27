import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendRejectedException;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

import static java.util.UUID.randomUUID;
import static java.util.concurrent.TimeUnit.MILLISECONDS;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.simplejavamail.api.mailer.AsyncQueueRejectionReason.QUEUE_FULL;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.ACCEPTED;

/**
 * The assembled dispatcher from the Polar Meridian case study, targeting the
 * Simple Java Mail 10.0.0 API. This is application code, not part of the library.
 * See README.md for adapter contracts, wiring, tests and deployment limitations.
 */
public final class PolarMeridianDispatcher {
    public enum Workload { URGENT, ROUTINE, BULK }

    private final SimpleJavaMail mail;
    private final MailOutbox outbox;
    private final MessagePreparation preparation;
    private final SendLimits limits;
    private final AttemptArchive archive;
    private final Executor completionWorkers;
    private final Consumer<Throwable> reportFailure;
    private final Clock clock;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(3);
    private final AtomicBoolean started = new AtomicBoolean();

    public PolarMeridianDispatcher(SimpleJavaMail mail, MailOutbox outbox,
            MessagePreparation preparation, SendLimits limits, AttemptArchive archive,
            Executor completionWorkers, Consumer<Throwable> reportFailure, Clock clock) {
        this.mail = mail;
        this.outbox = outbox;
        this.preparation = preparation;
        this.limits = limits;
        this.archive = archive;
        this.completionWorkers = completionWorkers;
        this.reportFailure = reportFailure;
        this.clock = clock;
    }

    public void start() {
        if (!started.compareAndSet(false, true)) {
            throw new IllegalStateException("Dispatcher already started");
        }
        // Independent polls: a paused or slow bulk job does not stop urgent claims.
        // Tune this interval against the database and the required peak throughput.
        for (Workload workload : Workload.values()) {
            scheduler.scheduleWithFixedDelay(() -> dispatchPending(workload), 0, 20, MILLISECONDS);
        }
    }

    // One polling pass for one traffic class; the scheduler calls it again.
    void dispatchPending(Workload workload) {
        try {
            Optional<Job> next = outbox.claimNextDue(workload, clock.instant());
            if (next.isEmpty()) {
                return;
            }
            Job job = next.get();
            try {
                PreparedMail prepared = prepare(job);
                if (!limits.tryAcquire(prepared.email.getId(), job.requestId,
                        prepared.quotaScope, job.workload, prepared.email.getRecipients().size())) {
                    outbox.defer(job, clock.instant().plusSeconds(1));
                    return;
                }
                MailSend<MailSubmissionReceipt> send =
                        sendArchived(prepared.mailer, job.requestId, prepared.email);
                send.getCompletion()
                        .handleAsync((receipt, failure) -> {
                            recordResult(job, prepared.email.getId(), receipt, unwrap(failure));
                            return null;
                        }, completionWorkers)
                        .exceptionally(failure -> {
                            // A rejected callback or failed database write leaves the claim
                            // unresolved. Recovery must not blindly put it back in the queue.
                            reportFailure.accept(unwrap(failure));
                            return null;
                        });
            } catch (Exception failure) {
                // Includes revoked permissions, bad certificates and synchronous failures.
                // Any acquired charge remains conservative until the failure is investigated.
                outbox.holdForReview(job, failure);
            }
        } catch (Exception failure) {
            // An exception escaping a scheduled task would suppress its future polls.
            reportFailure.accept(failure);
        }
    }

    PreparedMail prepare(Job job) throws Exception {
        preparation.checkPermissions(job);
        PreparedMail rendered = preparation.render(job);
        Email email = mail.emailBuilder()
                .copying(rendered.email)
                .fixingMessageId("<" + randomUUID() + "@mail.polarmeridian.com>")
                .buildEmail();
        preparation.checkFinalMessage(job, rendered.mailer, email);
        return new PreparedMail(rendered.mailer, rendered.quotaScope, email);
    }

    MailSend<MailSubmissionReceipt> sendArchived(
            Mailer mailer, String requestId, Email email) {
        archive.insertAttempt(email.getId(), requestId, email);
        return mailer.async().sendMail(email);
    }

    void recordResult(Job job, String attemptId, MailSubmissionReceipt receipt,
            Throwable failure) {
        try {
            if (failure instanceof MailSendRejectedException
                    && ((MailSendRejectedException) failure).getReason() == QUEUE_FULL) {
                limits.releaseUnsent(attemptId);
                outbox.defer(job, clock.instant().plusSeconds(5));
            } else if (failure == null && receipt != null && receipt.getStatus() == ACCEPTED) {
                limits.complete(attemptId);
                outbox.markSubmitted(job, receipt);
            } else {
                // Partial/unknown acceptance, other failures and logging-only/no-receipt
                // completions are not treated as a successful submission or retried here.
                outbox.holdForReview(job, failure != null ? failure :
                        new IllegalStateException("Submission needs review: " +
                                (receipt == null ? "no receipt" : receipt.getStatus())));
            }
        } catch (Exception persistenceFailure) {
            throw new CompletionException(persistenceFailure);
        }
    }

    public void stopAndAwait() throws InterruptedException {
        scheduler.shutdown();
        if (!scheduler.awaitTermination(30, SECONDS)) {
            throw new IllegalStateException("Dispatchers have not stopped; do not close the Mailers yet");
        }
        // The caller next closes the Mailers, then drains completionWorkers (also
        // used by the article's observer). This method does not cancel admitted sends.
    }

    private static Throwable unwrap(Throwable failure) {
        while ((failure instanceof CompletionException || failure instanceof ExecutionException)
                && failure.getCause() != null) {
            failure = failure.getCause();
        }
        return failure;
    }

    public static final class Job {
        public final String requestId;
        public final String claimToken;
        public final Workload workload;

        public Job(String requestId, String claimToken, Workload workload) {
            this.requestId = requestId;
            this.claimToken = claimToken;
            this.workload = workload;
        }
    }

    public static final class PreparedMail {
        public final Mailer mailer;
        public final String quotaScope;
        public final Email email;

        public PreparedMail(Mailer mailer, String quotaScope, Email email) {
            this.mailer = mailer;
            this.quotaScope = quotaScope;
            this.email = email;
        }
    }

    /**
     * Application database adapter. claimNextDue atomically claims and commits one
     * eligible row with a fresh claim token. It uses the workload assigned during
     * onboarding, checks expiry/suspension and retains the original request age.
     * Updates must match that claim token, commit durably and be idempotent.
     * A crashed/expired claim goes to review, not straight back to pending: SMTP
     * might have accepted it. A timed-out Java process is not proof of an unsent mail.
     */
    public interface MailOutbox {
        Optional<Job> claimNextDue(Workload workload, Instant now);
        void defer(Job job, Instant notBefore);
        void markSubmitted(Job job, MailSubmissionReceipt receipt);
        void holdForReview(Job job, Throwable reason);
    }

    /**
     * Application security/template adapter, including the article's partnerDirectory.
     * Check current permissions, sender, expiry, recipient approvals and any required
     * signing/encryption; resolve current trusted certificates when rendering.
     * checkFinalMessage must include Mailer configuration: this sample requires all
     * envelope recipients in Email.getRecipients(), with no later additions or rewrites.
     * It also rejects logging-only Mailers for real jobs. The quota scope is assigned
     * by platform configuration, never supplied unchecked by the requesting application.
     */
    public interface MessagePreparation {
        void checkPermissions(Job job) throws Exception;
        PreparedMail render(Job job) throws Exception;
        void checkFinalMessage(Job job, Mailer mailer, Email email) throws Exception;
    }

    /** See JdbcDispatchLimits for the database-backed implementation. */
    public interface SendLimits {
        boolean tryAcquire(String attemptId, String requestId, String scope,
                Workload workload, int recipients) throws Exception;
        void complete(String attemptId) throws Exception;
        void releaseUnsent(String attemptId) throws Exception;
    }

    /**
     * Encrypt and commit the approved content before handing it to SMTP; enforce
     * access/retention controls. The MailSendObserver records outcomes separately.
     * Email is not necessarily the exact transmitted EML after Mailer processing.
     */
    public interface AttemptArchive {
        void insertAttempt(String attemptId, String requestId, Email email);
    }
}
