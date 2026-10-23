import org.simplejavamail.api.mailer.config.ConnectionPoolConfig;
import org.simplejavamail.api.mailer.config.TlsConfig;
import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.MailSendDiagnostics;
import org.simplejavamail.api.mailer.MailSendMeasurement;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.MailerRegularBuilder;
import org.simplejavamail.api.mailer.config.FailoverPolicy;
import org.simplejavamail.api.mailer.config.TransportStrategy;
import org.simplejavamail.config.ConfigLoader;
import org.simplejavamail.mailer.internal.MailSendDiagnosticsImpl;
import org.simplejavamail.mailer.internal.MailSendMeasurementImpl;
import org.simplejavamail.mailer.internal.MailSendOutcomeImpl;
import testutil.smtp.RecordingSmtpServer;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

import static java.util.UUID.randomUUID;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.ACCEPTED;
import static org.simplejavamail.api.mailer.MailSubmissionStatus.UNKNOWN;

/** Configuration checks and SMTP on loopback only; no external mail or credentials. */
public final class PolarMeridianMailersTest {
    private static int checks;

    public static void main(String[] args) throws Exception {
        locks();
        timings();
        failoverAndRecovery();
        noReplayAfterSubmission();
        System.out.println("Passed " + checks + " Polar Meridian Mailer checks; SMTP fixtures stayed on loopback.");
    }

    private static void locks() throws Exception {
        SimpleJavaMail mail = PolarMeridianMailers.productionFactory(ConfigLoader.builder()
                .withMap("regional deployment", Map.of("simplejavamail.transportstrategy", "SMTP")));
        try (Mailer mailer = mail.mailerBuilder().withSMTPServer("127.0.0.1", 1)
                .withConnectionPoolConfig(ConnectionPoolConfig.builder().withCoreSize(0).build()).buildMailer()) {
            check("true".equals(mailer.getSession().getProperty("mail.smtp.starttls.required")),
                    "The locked policy wins over an ordinary deployment value");
            check("true".equals(mailer.getSession().getProperty("mail.smtp.ssl.checkserveridentity")),
                    "Server identity verification stays enabled");
            check(mail.getConfig().getDiagnostics().toString().contains("platform policy"),
                    "Diagnostics retain the policy's source");
        }
        rejects(() -> mail.mailerBuilder().withTransportStrategy(TransportStrategy.SMTP).buildMailer());
        rejects(() -> mail.mailerBuilder().withTlsConfig(TlsConfig.builder().trustingAllHosts(true).build()).buildMailer());
        rejects(() -> mail.mailerBuilder().withTlsConfig(TlsConfig.builder().verifyingServerIdentity(false).build()).buildMailer());
    }

    private static void timings() {
        // Internal builders are used only for synthetic test fixtures; application helpers consume public result interfaces.
        MailSendMeasurement absent = MailSendMeasurementImpl.builder().unavailableReason("Not measured in this fixture").build();
        MailSendMeasurement zero = MailSendMeasurementImpl.builder().elapsed(Duration.ZERO).build();
        MailSendDiagnostics report = MailSendDiagnosticsImpl.builder().elapsed(Duration.ofMillis(24))
                .preparation(zero).scheduling(absent).rateLimitWait(absent)
                .connectionAcquisition(MailSendMeasurementImpl.builder().elapsed(Duration.ofMillis(15)).build())
                .mimePreparation(absent)
                .submission(MailSendMeasurementImpl.builder().elapsed(Duration.ofMillis(9)).build()).cleanup(zero)
                .smtpHost("relay.test.invalid").smtpPort(587).build();
        Instant now = Instant.parse("2026-10-12T10:00:00Z");
        MailSendOutcome outcome = MailSendOutcomeImpl.builder().initialMessageId("<timing@test.invalid>")
                .requestedAt(now).completedAt(now)
                .failure(new IllegalStateException("Synthetic terminal result")).diagnostics(report).build();
        Map<String, Duration> metrics = new LinkedHashMap<>();
        PolarMeridianMailers.recordTimings(outcome, metrics::put);
        check(metrics.size() == 4, "Unmeasured stages do not become zero-valued metrics");
        check(Duration.ZERO.equals(metrics.get("preparation")), "A measured zero is retained");
        check(Duration.ofMillis(15).equals(metrics.get("connection")), "Connection acquisition has its own sample");
        check(Duration.ofMillis(9).equals(metrics.get("submission")), "Submission is separate from acquisition");
        check(!metrics.containsKey("rate_wait"), "No rate measurement means no sample, not zero");
        MailSendOutcome oldSnapshot = MailSendOutcomeImpl.builder().initialMessageId("<old@test.invalid>")
                .requestedAt(now).completedAt(now).failure(new IllegalStateException("No diagnostics")).build();
        PolarMeridianMailers.recordTimings(oldSnapshot, (name, value) -> {
            throw new AssertionError("An absent report must not invent a metric");
        });
        check(true, "Older outcomes without diagnostics remain usable");
    }

    private static void failoverAndRecovery() throws Exception {
        AtomicBoolean offline = new AtomicBoolean(true);
        try (RecordingSmtpServer a = new RecordingSmtpServer((peer, connection) -> {
                 if (offline.get()) { peer.reply("421 relay unavailable"); peer.close(); return; }
                 connection.greet(peer, "250 localhost");
                 connection.acceptMessages(peer);
             });
             RecordingSmtpServer b = new RecordingSmtpServer()) {
            SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
            List<MailSendOutcome> outcomes = new CopyOnWriteArrayList<>();
            // A tiny positive interval makes the next operation eligible without a test sleep.
            FailoverPolicy policy = FailoverPolicy.builder()
                    .withPrimaryRecheckInterval(Duration.ofNanos(1)).build();
            PolarMeridianMailers.Mailers mailers = PolarMeridianMailers.build(
                    builder(mail, a.port()), builder(mail, b.port()), builder(mail, b.port()),
                    policy, outcomes::add, Runnable::run);
            try {
                check(!policy.isFailoverOnAuthenticationFailure(), "Bad credentials do not silently choose another route");
                check(!policy.isFailoverOnCertificateVerificationFailure(), "Certificate failures stop by default");
                byte[] retained = eml("confirmation-1");
                MailSubmissionReceipt result = mailers.urgent.async().sendMail(exact(mail, retained))
                        .getCompletion().get(10, SECONDS);
                check(result.getStatus() == ACCEPTED, "The approved backup accepts the same operation");
                check(a.messages().isEmpty() && b.messages().size() == 1, "Only B received the first message");
                check(Arrays.equals(retained, b.messages().get(0)), "The submitted bytes equal the retained EML");
                check(b.commands().stream().anyMatch(command -> command.contains("bounce@test.invalid")),
                        "Failover preserves the explicit envelope sender");
                check(outcomes.size() == 1, "Failover emits one terminal observer outcome");
                check(outcomes.get(0).getDiagnostics().orElseThrow().getConnectionHistory().size() >= 2,
                        "A failed connection and B's acquisition remain visible");
                offline.set(false);
                mailers.urgent.async().sendMail(exact(mail, eml("confirmation-2")))
                        .getCompletion().get(10, SECONDS);
                check(a.messages().size() == 1 && b.messages().size() == 1,
                        "Later work returns to A; the first message is not replayed");
                check(outcomes.size() == 2, "Each distinct email keeps one outcome");
            } finally {
                for (Mailer mailer : mailers.all()) mailer.close();
            }
        }
    }

    private static void noReplayAfterSubmission() throws Exception {
        try (RecordingSmtpServer a = new RecordingSmtpServer((peer, connection) -> {
                 connection.greet(peer, "250 localhost");
                 connection.acceptMessages(peer, (String) null);
             });
             RecordingSmtpServer b = new RecordingSmtpServer()) {
            SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
            List<MailSendOutcome> outcomes = new CopyOnWriteArrayList<>();
            PolarMeridianMailers.Mailers mailers = PolarMeridianMailers.build(
                    builder(mail, a.port()), builder(mail, b.port()), builder(mail, b.port()),
                    FailoverPolicy.builder().build(), outcomes::add, Runnable::run);
            try {
                boolean failed = false;
                try {
                    mailers.urgent.async().sendMail(exact(mail, eml("uncertain")))
                            .getCompletion().get(10, SECONDS);
                } catch (ExecutionException expected) { failed = true; }
                check(failed, "Losing the final acceptance reply remains a failed operation");
                check(a.messages().size() == 1, "A received the complete DATA content");
                check(b.messages().isEmpty(), "Unknown acceptance does not replay content through B");
                check(outcomes.size() == 1, "An uncertain submission still produces only one outcome");
                check(outcomes.get(0).getSubmissionReceipt().orElseThrow().getStatus() == UNKNOWN,
                        "The caller retains unknown acceptance, not a false rejection");
            } finally {
                for (Mailer mailer : mailers.all()) mailer.close();
            }
        }
    }

    private static MailerRegularBuilder<?> builder(SimpleJavaMail mail, int port) {
        return mail.mailerBuilder().withSMTPServer("127.0.0.1", port)
                .withTransportStrategy(TransportStrategy.SMTP)
                .withProperty("mail.smtp.localhost", "probe.example.test")
                .withConnectionPoolConfig(ConnectionPoolConfig.builder()
                        .withClusterKey(randomUUID()).withCoreSize(0).withMaxSize(1).build()).withMailSendTimeout(Duration.ofSeconds(5));
    }

    private static byte[] eml(String id) {
        return ("From: orders@test.invalid\r\nTo: recipient@test.invalid\r\n"
                + "Message-ID: <" + id + "@test.invalid>\r\nSubject: Test confirmation\r\n"
                + "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=us-ascii\r\n\r\n"
                + "Retained communication.\r\n").getBytes(StandardCharsets.US_ASCII);
    }

    private static Email exact(SimpleJavaMail mail, byte[] bytes) {
        return mail.emailBuilder().startingFromExactEml(bytes)
                .withEnvelopeSender("bounce@test.invalid")
                .withEnvelopeRecipients("recipient@test.invalid").buildEmail();
    }

    private static void rejects(Runnable operation) {
        boolean rejected = false;
        try { operation.run(); } catch (IllegalArgumentException | IllegalStateException expected) { rejected = true; }
        check(rejected, "A conflicting customization is rejected before SMTP");
    }

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }
}
