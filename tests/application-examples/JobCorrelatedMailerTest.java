import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.CustomMailer;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendProgress;
import org.simplejavamail.api.mailer.MailSendRejectedException;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.config.AsyncExecutionConfig;
import org.simplejavamail.api.mailer.config.OperationalConfig;
import org.simplejavamail.config.ConfigLoader;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static java.util.concurrent.TimeUnit.SECONDS;

/** Executable application-example checks. CustomMailer never opens an SMTP connection. */
public final class JobCorrelatedMailerTest {
    private static final String MESSAGE_ID = "<reused-invoice@example.org>";
    private static int checks;

    public static void main(String[] args) throws Exception {
        SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
        Email sameEmail = mail.emailBuilder().startingBlank()
                .from("invoices@example.org").to("customer@example.org")
                .withSubject("Invoice notice").withPlainText("Reused content")
                .fixingMessageId(MESSAGE_ID).buildEmail();
        CountDownLatch twoRunning = new CountDownLatch(2);
        CountDownLatch releaseSends = new CountDownLatch(1);
        CountDownLatch releaseOutcomes = new CountDownLatch(1);
        AtomicInteger providerCalls = new AtomicInteger();
        RecordingEvents events = new RecordingEvents();
        ExecutorService observationWorkers = Executors.newSingleThreadExecutor();
        ExecutorService callers = Executors.newFixedThreadPool(2);
        observationWorkers.execute(() -> await(releaseOutcomes, "Release outcome callbacks"));

        CustomMailer synthetic = new CustomMailer() {
            @Override
            public void testConnection(OperationalConfig config, Session session) {
                throw new AssertionError("No connection test expected");
            }

            @Override
            public void sendMessage(OperationalConfig config, Session session, Email email, MimeMessage message) {
                int invocation = providerCalls.incrementAndGet();
                if (invocation <= 2) {
                    twoRunning.countDown();
                    await(releaseSends, "Release concurrent synthetic sends");
                }
            }
        };

        try (JobCorrelatedMailer jobs = new JobCorrelatedMailer(mail.mailerBuilder()
                .withSMTPServer("unused.example.invalid", 25)
                .withAsyncExecutionConfig(AsyncExecutionConfig.builder()
                        .withThreadPoolSize(2).withQueueCapacity(2).rejectWhenFull().build())
                .withCustomMailer(synthetic), events, observationWorkers)) {
            try {
                ThreadLocal<String> context = submissionContext(jobs);
                Future<MailSend<MailSubmissionReceipt>> firstCall = callers.submit(() -> {
                    MailSend<MailSubmissionReceipt> send = jobs.sendAsync("invoice-1001", sameEmail);
                    check(context.get() == null, "First caller has no leaked context after submission");
                    return send;
                });
                Future<MailSend<MailSubmissionReceipt>> secondCall = callers.submit(() -> {
                    MailSend<MailSubmissionReceipt> send = jobs.sendAsync("invoice-1002", sameEmail);
                    check(context.get() == null, "Second caller has no leaked context after submission");
                    return send;
                });
                MailSend<MailSubmissionReceipt> first = firstCall.get(10, SECONDS);
                MailSend<MailSubmissionReceipt> second = secondCall.get(10, SECONDS);
                await(twoRunning, "Two sends run concurrently");

                context.set("outer-job");
                MailSend<MailSubmissionReceipt> third;
                try {
                    third = jobs.sendAsync("invoice-1003", sameEmail);
                    check("outer-job".equals(context.get()), "Nested submission restores its prior context");
                } finally {
                    context.remove();
                }
                MailSend<MailSubmissionReceipt> fourth = jobs.sendAsync("invoice-1004", sameEmail);
                check(context.get() == null, "Queued submission removes its local context immediately");
                check(!third.getCompletion().isDone() && !fourth.getCompletion().isDone(),
                        "Two further sends wait while both workers are occupied");
                check(providerCalls.get() == 2, "Queued sends have not reached CustomMailer");

                MailSend<MailSubmissionReceipt> rejected = jobs.sendAsync("invoice-capacity", sameEmail);
                check(context.get() == null, "Capacity rejection also removes submission context");
                check(rejected.getCompletion().isCompletedExceptionally(), "Full queue rejects the fifth send");
                check(events.outcomes.isEmpty(), "Result callbacks can remain pending after their handoff");

                releaseSends.countDown();
                first.getCompletion().get(10, SECONDS);
                second.getCompletion().get(10, SECONDS);
                third.getCompletion().get(10, SECONDS);
                fourth.getCompletion().get(10, SECONDS);
                check(providerCalls.get() == 4, "Only admitted sends invoke CustomMailer");
                releaseOutcomes.countDown();
                await(events.allOutcomes, "Every send's terminal callback is delivered");

                check(events.failure.get() == null, "Observed progress and outcomes retain their captured identities");
                check(events.outcomes.size() == 5, "Each business job receives exactly one full outcome");
                check(new HashSet<>(events.outcomeIds.values()).size() == 5,
                        "Reusing one Email still generates a separate observation UUID per send");
                for (String jobId : Arrays.asList("invoice-1001", "invoice-1002", "invoice-1003", "invoice-1004")) {
                    MailSendOutcome outcome = events.outcomes.get(jobId);
                    check(outcome != null && outcome.isSuccessful(), "Successful outcome belongs to " + jobId);
                    check(MESSAGE_ID.equals(outcome.getInitialMessageId()), "Message-ID is independent of " + jobId);
                }
                check(events.outcomes.get("invoice-capacity").getFailure().orElse(null)
                                instanceof MailSendRejectedException,
                        "Rejected job receives its own failure outcome");
                // No count or stage assertion: progress may be coalesced, dropped, or arrive after the outcome.
            } finally {
                releaseSends.countDown();
                releaseOutcomes.countDown();
            }
        } finally {
            callers.shutdown();
            observationWorkers.shutdown();
            check(callers.awaitTermination(10, SECONDS), "Application caller executor drains");
            check(observationWorkers.awaitTermination(10, SECONDS), "Application observer executor drains");
        }
        System.out.println("Passed " + checks + " job-correlation checks; CustomMailer used no SMTP connection.");
    }

    @SuppressWarnings("unchecked")
    private static ThreadLocal<String> submissionContext(JobCorrelatedMailer jobs) throws Exception {
        // Test-only inspection proves cleanup without adding a diagnostic API to the application helper.
        Field field = JobCorrelatedMailer.class.getDeclaredField("submittingJob");
        field.setAccessible(true);
        return (ThreadLocal<String>) field.get(jobs);
    }

    private static void await(CountDownLatch latch, String reason) {
        try {
            if (!latch.await(10, SECONDS)) {
                throw new AssertionError(reason);
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError(reason, interrupted);
        }
    }

    private static synchronized void check(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
        checks++;
    }

    private static final class RecordingEvents implements JobCorrelatedMailer.JobEvents {
        private final Map<String, MailSendOutcome> outcomes = new ConcurrentHashMap<>();
        private final Map<String, UUID> outcomeIds = new ConcurrentHashMap<>();
        private final Map<UUID, String> owners = new ConcurrentHashMap<>();
        private final Set<String> expectedJobs = new HashSet<>(Arrays.asList(
                "invoice-1001", "invoice-1002", "invoice-1003", "invoice-1004", "invoice-capacity"));
        private final CountDownLatch allOutcomes = new CountDownLatch(5);
        private final AtomicReference<String> failure = new AtomicReference<>();

        @Override
        public void onProgress(String jobId, UUID observationId, MailSendProgress progress) {
            inspect(jobId, observationId, progress.getObservationId());
        }

        @Override
        public void onOutcome(String jobId, UUID observationId, MailSendOutcome outcome) {
            inspect(jobId, observationId, outcome.getObservationId());
            if (outcomes.putIfAbsent(jobId, outcome) != null) {
                failure.compareAndSet(null, "Duplicate outcome for " + jobId);
            }
            outcomeIds.put(jobId, observationId);
            allOutcomes.countDown();
        }

        private void inspect(String jobId, UUID capturedId, UUID eventId) {
            if (!expectedJobs.contains(jobId) || !capturedId.equals(eventId)) {
                failure.compareAndSet(null, "Wrong captured job or observation ID");
            }
            String previousOwner = owners.putIfAbsent(capturedId, jobId);
            if (previousOwner != null && !previousOwner.equals(jobId)) {
                failure.compareAndSet(null, "Observation belongs to another business job");
            }
        }
    }
}
