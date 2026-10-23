import org.simplejavamail.api.mailer.MailSendHandlers;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSendMeasurement;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailerRegularBuilder;
import org.simplejavamail.api.mailer.MailSendResultObserver;
import org.simplejavamail.api.mailer.config.FailoverPolicy;
import org.simplejavamail.config.ConfigLoader;

import java.time.Duration;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.Executor;
import java.util.function.BiConsumer;

/** Configuration and observation helpers used by Polar Meridian's Dispatcher. */
public final class PolarMeridianMailers {
    private PolarMeridianMailers() { }

    // Deployment sources contain ordinary defaults. These three requirements
    // stay fixed for Mailers built from this factory, including the approved backup.
    public static SimpleJavaMail productionFactory(ConfigLoader deploymentSources) {
        Properties policy = new Properties();
        policy.setProperty("simplejavamail.locked.transportstrategy", "SMTP_TLS");
        policy.setProperty("simplejavamail.locked.defaults.trustallhosts", "false");
        policy.setProperty("simplejavamail.locked.defaults.verifyserveridentity", "true");
        return SimpleJavaMail.withConfig(deploymentSources
                .withProperties("platform policy", policy).load());
    }

    // Builders already contain the article's approved hosts, credentials, timeouts,
    // independent pool keys and worker settings. Both urgent destinations must honor
    // the same recipients, envelope and protection; this does not authorize a new route.
    public static Mailers build(MailerRegularBuilder<?> urgentABuilder,
            MailerRegularBuilder<?> urgentBBuilder, MailerRegularBuilder<?> bulkBuilder,
            FailoverPolicy policy, MailSendResultObserver observationSink, Executor observationWorkers) {
        Mailer urgentB = urgentBBuilder
                .withSendHandlers(MailSendHandlers.builder().withResultObserver(observationSink, observationWorkers).build()).buildMailer();
        Mailer urgentA = null;
        try {
            urgentA = urgentABuilder
                    .withFailoverMailer(urgentB, policy)
                    .withSendHandlers(MailSendHandlers.builder().withResultObserver(observationSink, observationWorkers).build()).buildMailer();
            Mailer bulk = bulkBuilder
                    .withSendHandlers(MailSendHandlers.builder().withResultObserver(observationSink, observationWorkers).build()).buildMailer();
            return new Mailers(urgentA, urgentB, bulk);
        } catch (RuntimeException | Error failure) {
            closeUnused(urgentA, failure);
            closeUnused(urgentB, failure);
            throw failure;
        }
    }

    // Stable stage labels only: do not put recipient addresses or message IDs in metrics.
    // An absent measurement is omitted; a measured zero remains a real sample.
    public static void recordTimings(MailSendOutcome outcome,
            BiConsumer<String, Duration> metrics) {
        outcome.getDiagnostics().ifPresent(report -> {
            recordMeasured(metrics, "preparation", report.getPreparation());
            recordMeasured(metrics, "scheduling", report.getScheduling());
            recordMeasured(metrics, "rate_wait", report.getRateLimitWait());
            recordMeasured(metrics, "connection", report.getConnectionAcquisition());
            recordMeasured(metrics, "mime", report.getMimePreparation());
            recordMeasured(metrics, "submission", report.getSubmission());
            recordMeasured(metrics, "cleanup", report.getCleanup());
        });
    }

    private static void recordMeasured(BiConsumer<String, Duration> metrics,
            String name, MailSendMeasurement measurement) {
        Duration elapsed = measurement.getElapsed();
        if (elapsed != null) metrics.accept(name, elapsed);
    }

    private static void closeUnused(Mailer mailer, Throwable failure) {
        if (mailer == null) return;
        try {
            mailer.close();
        } catch (Exception cleanupFailure) {
            failure.addSuppressed(cleanupFailure);
            if (cleanupFailure instanceof InterruptedException) Thread.currentThread().interrupt();
        }
    }

    public static final class Mailers {
        public final Mailer urgent;
        public final Mailer backup;
        public final Mailer bulk;

        private Mailers(Mailer urgent, Mailer backup, Mailer bulk) {
            this.urgent = urgent;
            this.backup = backup;
            this.bulk = bulk;
        }

        // The supplied backup is borrowed, not closed by urgent.close().
        // Stop Dispatcher polls, close these in this order, then drain observers.
        public List<Mailer> all() {
            return List.of(urgent, backup, bulk);
        }
    }
}
