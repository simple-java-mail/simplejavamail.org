import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.EmailPopulatingBuilder;
import org.simplejavamail.api.email.ExactEmailBuilder;
import org.simplejavamail.api.email.Recipient;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.mailer.MailRehearsal;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendRejectedException;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;
import jakarta.mail.Message.RecipientType;
import jakarta.mail.internet.InternetHeaders;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
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
    public enum Retention { METADATA_ONLY, EXACT_EML }

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
                        prepared.sendingQuotaGroup, job.workload, prepared.evidence.recipients.size())) {
                    outbox.defer(job, clock.instant().plusSeconds(1));
                    return;
                }
                MailSend<MailSubmissionReceipt> send =
                        sendArchived(prepared, job.requestId);
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
        ComposedMail composed = preparation.compose(job);
        Mailer mailer = composed.mailer;

        EmailPopulatingBuilder attempt = mail.emailBuilder()
                .copying(composed.email)
                .fixingMessageId("<" + randomUUID() + "@mail.polarmeridian.com>");
        if (!composed.email.getOverrideReceivers().isEmpty()) {
            attempt.withOverrideReceivers(composed.email.getOverrideReceivers());
        }
        Email email = attempt.buildEmail();

        MailRehearsal rehearsal = mailer.rehearse(email);
        preparation.checkFinalMessage(job, mailer, rehearsal);
        if (!rehearsal.isFullRehearsal() || !Objects.equals(email.getId(), rehearsal.getEmailId())) {
            throw new IllegalStateException("Preparation must preserve the attempt ID and apply protection");
        }
        AttemptEvidence evidence = new AttemptEvidence(rehearsal, composed.retention);
        Email submission = composed.retention == Retention.EXACT_EML
                ? exactSubmission(evidence) : email;
        return new PreparedMail(mailer, composed.sendingQuotaGroup, submission, evidence);
    }

    MailSend<MailSubmissionReceipt> sendArchived(
            PreparedMail prepared, String requestId) {
        archive.insertAttempt(prepared.email.getId(), requestId, prepared.evidence);
        return prepared.mailer.async().sendMail(prepared.email);
    }

    Email exactSubmission(AttemptEvidence evidence) throws Exception {
        byte[] eml = evidence.getEmlBytes().orElseThrow();
        InternetHeaders headers = new InternetHeaders(new ByteArrayInputStream(eml));
        for (String name : List.of("Bcc", "Resent-Bcc", "Content-Length")) {
            if (headers.getHeader(name) != null) {
                throw new IllegalArgumentException("Unsafe outbound EML header: " + name);
            }
        }
        if (evidence.envelopeSender == null) {
            throw new IllegalArgumentException("Retained mail needs an explicit envelope sender (withBounceTo)");
        }
        ExactEmailBuilder exact = mail.emailBuilder().startingFromExactEml(eml)
                .withEnvelopeRecipients(evidence.recipients.toArray(new Recipient[0]))
                .withEnvelopeSender(evidence.envelopeSender);
        if (evidence.dsn != null) {
            exact.withDeliveryStatusNotification(evidence.dsn);
        }
        if (evidence.requireTls) {
            exact.withTlsRequiredForOnwardDelivery();
        }
        return exact.buildEmail();
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

    /** Application carrier for SJM objects plus Dispatcher-only limits and retention. */
    public static final class ComposedMail {
        public final Mailer mailer;
        /** Shared database sending-limit group used by SendLimits, not an SJM setting. */
        public final String sendingQuotaGroup;
        public final Email email;
        public final Retention retention;

        public ComposedMail(Mailer mailer, String sendingQuotaGroup, Email email, Retention retention) {
            this.mailer = mailer;
            this.sendingQuotaGroup = sendingQuotaGroup;
            this.email = email;
            this.retention = Objects.requireNonNull(retention);
        }
    }

    public static final class PreparedMail {
        public final Mailer mailer;
        /** Same application limit group selected during composition, not a pool or cluster ID. */
        public final String sendingQuotaGroup;
        public final Email email;
        public final AttemptEvidence evidence;

        PreparedMail(Mailer mailer, String sendingQuotaGroup, Email email, AttemptEvidence evidence) {
            this.mailer = mailer;
            this.sendingQuotaGroup = sendingQuotaGroup;
            this.email = email;
            this.evidence = evidence;
        }
    }

    /** Storage input deliberately has no Email, subject, signing keys or rehearsal object. */
    public static final class AttemptEvidence {
        public final String envelopeSender;
        public final List<Recipient> recipients;
        public final DeliveryStatusNotification dsn;
        public final boolean requireTls;
        public final long encodedSize;
        private final byte[] eml;

        AttemptEvidence(MailRehearsal rehearsal, Retention retention) {
            envelopeSender = rehearsal.getEnvelopeSender();
            recipients = envelopeRecipients(rehearsal);
            dsn = rehearsal.getEffectiveEmail().getDeliveryStatusNotification();
            requireTls = rehearsal.getEffectiveEmail().isTlsRequiredForOnwardDelivery();
            eml = retention == Retention.EXACT_EML ? finishSmtpLine(rehearsal.getEmlBytes()) : null;
            encodedSize = eml == null ? rehearsal.getEncodedSize() : eml.length;
        }

        public Optional<byte[]> getEmlBytes() {
            return eml == null ? Optional.empty() : Optional.of(eml.clone());
        }
    }

    // SMTP finishes an unterminated last line before its DATA terminator. Do that
    // explicitly before retaining bytes, without reserializing MIME or repairing bare LF/CR.
    private static byte[] finishSmtpLine(byte[] eml) {
        for (int i = 0; i < eml.length; i++) {
            if ((eml[i] == '\r' && (i + 1 == eml.length || eml[i + 1] != '\n'))
                    || (eml[i] == '\n' && (i == 0 || eml[i - 1] != '\r'))) {
                throw new IllegalArgumentException("Outbound EML contains a bare CR or LF");
            }
        }
        if (eml.length >= 2 && eml[eml.length - 2] == '\r' && eml[eml.length - 1] == '\n') {
            return eml;
        }
        byte[] terminated = Arrays.copyOf(eml, eml.length + 2);
        terminated[eml.length] = '\r';
        terminated[eml.length + 1] = '\n';
        return terminated;
    }

    // Preserve recipient occurrences and their DSN preferences in SMTP envelope order.
    private static List<Recipient> envelopeRecipients(MailRehearsal rehearsal) {
        Email effective = rehearsal.getEffectiveEmail();
        List<Recipient> configured = new ArrayList<>(effective.getOverrideReceivers());
        if (configured.isEmpty()) {
            for (RecipientType type : List.of(RecipientType.TO, RecipientType.CC, RecipientType.BCC)) {
                effective.getRecipients().stream().filter(recipient -> type.equals(recipient.getType()))
                        .forEach(configured::add);
            }
        }
        List<String> addresses = rehearsal.getEnvelopeRecipients();
        if (configured.size() != addresses.size()) {
            throw new IllegalArgumentException("Use recipient builders, not raw recipient headers");
        }
        List<Recipient> envelope = new ArrayList<>();
        for (int i = 0; i < addresses.size(); i++) {
            envelope.add(new Recipient(null, addresses.get(i), null, null,
                    configured.get(i).getDeliveryStatusNotificationNotifyOptions()));
        }
        return List.copyOf(envelope);
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
     * Application permission/composition adapter, including the article's partnerDirectory.
     * Check current permissions, sender, expiry, recipient approvals and any required
     * signing/encryption; resolve current trusted certificates when composing.
     * compose builds an Email and selects its Mailer and shared sending quota group.
     * Retention comes from approved message rules, never from traffic priority or
     * an unchecked request: orders/maintenance retain EML, login codes/bulk do not.
     * For the concrete order-confirmation path, see OrderConfirmationComposer.
     * Composition supplies protection settings; rehearsal performs the MIME preparation,
     * signing and encryption. Neither step contacts SMTP.
     * checkFinalMessage checks the full rehearsal's effective Email, envelope, size and
     * protection, including configured recipients. It rejects logging-only Mailers.
     * Retained mail needs withBounceTo and safe outbound headers; use explicit envelope
     * recipients instead of Bcc headers. Do not mutate Mailer/Session settings mid-flight.
     * Metadata-only sends use the same composed inputs/configuration after rehearsal;
     * their later MIME rendering is not claimed to be byte-identical. The sending quota group is assigned
     * by platform configuration, never supplied unchecked by the requesting application.
     */
    public interface MessagePreparation {
        void checkPermissions(Job job) throws Exception;
        ComposedMail compose(Job job) throws Exception;
        void checkFinalMessage(Job job, Mailer mailer, MailRehearsal rehearsal) throws Exception;
    }

    /** See JdbcDispatchLimits for the database-backed implementation. */
    public interface SendLimits {
        boolean tryAcquire(String attemptId, String requestId, String sendingQuotaGroup,
                Workload workload, int recipientCount) throws Exception;
        void complete(String attemptId) throws Exception;
        void releaseUnsent(String attemptId) throws Exception;
    }

    /**
     * Commit metadata, plus encrypted EML only when present, before SMTP. Enforce
     * access/retention controls; keep decryption possible for retained protected mail.
     * Do not persist a body for metadata-only attempts. The observer records outcomes
     * separately. Stored bytes prove the submitted content, not receipt or legal compliance.
     */
    public interface AttemptArchive {
        void insertAttempt(String attemptId, String requestId, AttemptEvidence evidence);

        /** Update the existing attempt by Message-ID; safe for concurrent or repeated observations. */
        void recordOutcome(String attemptId, MailSendOutcome outcome);
    }
}
