import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.MailSend;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendProgress;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailerRegularBuilder;

import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** Example wiring. The caller supplies its approved SMTP configuration; nothing runs automatically. */
public final class JobCorrelationExample {
    private JobCorrelationExample() {
    }

    public static void sendTwoInvoices(SimpleJavaMail mail, MailerRegularBuilder<?> approvedSmtpBuilder)
            throws Exception {
        Email sameEmail = mail.emailBuilder().startingBlank()
                .from("invoices@example.org")
                .to("customer@example.org")
                .withSubject("Your invoice is available")
                .withPlainText("Sign in to view your invoices.")
                .fixingMessageId("<invoice-notice@example.org>")
                .buildEmail();

        ExecutorService observationWorkers = Executors.newSingleThreadExecutor();
        JobCorrelatedMailer.JobEvents events = new JobCorrelatedMailer.JobEvents() {
            @Override
            public void onProgress(String jobId, UUID observationId, MailSendProgress progress) {
                System.out.printf("%s / %s: %s%n", jobId, observationId, progress.getStage());
            }

            @Override
            public void onOutcome(String jobId, UUID observationId, MailSendOutcome outcome) {
                System.out.printf("%s / %s: successful=%s%n", jobId, observationId, outcome.isSuccessful());
            }
        };

        try (JobCorrelatedMailer jobs = new JobCorrelatedMailer(approvedSmtpBuilder, events, observationWorkers)) {
            MailSend<MailSubmissionReceipt> first = jobs.sendAsync("invoice-1001", sameEmail);
            MailSend<MailSubmissionReceipt> second = jobs.sendAsync("invoice-1002", sameEmail);
            first.getCompletion().join();
            second.getCompletion().join();
        } finally {
            // Closing the Mailer drains sends and handoff attempts, not executor-backed callbacks.
            observationWorkers.shutdown();
            if (!observationWorkers.awaitTermination(30, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Outcome callbacks have not drained");
            }
        }
    }
}
