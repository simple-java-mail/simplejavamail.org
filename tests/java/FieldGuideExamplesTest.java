import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.TimeUnit;
import org.simplejavamail.api.mailer.MailRecipientDisposition;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailRetryDisposition;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.SmtpCapabilities;
import org.simplejavamail.api.mailer.SmtpConnectionReport;

/** Offline checks of the example's decisions and shutdown ordering; no SMTP. */
public final class FieldGuideExamplesTest {
    public static void main(String[] args) throws Exception {
        MailRecipientResult accepted = recipient("accepted@example.test", MailRecipientDisposition.ACCEPTED);
        MailRecipientResult unsent = recipient("later@example.test", MailRecipientDisposition.VALID_UNSENT);
        MailRecipientResult invalid = recipient("invalid@example.test", MailRecipientDisposition.INVALID);
        MailSubmissionReceipt partial = receipt(MailSubmissionStatus.PARTIALLY_ACCEPTED,
            MailRetryDisposition.SAFE_TO_RETRY_UNACCEPTED, Arrays.asList(accepted, unsent, invalid));
        check(FieldGuideExamples.recipientsSafeToRetry(partial).equals(Collections.singletonList(unsent)),
            "Only known eligible recipients belong in a retry");
        MailSubmissionReceipt rejected = receipt(MailSubmissionStatus.REJECTED,
            MailRetryDisposition.SAFE_TO_RETRY_ALL, Collections.singletonList(unsent));
        check(FieldGuideExamples.recipientsSafeToRetry(rejected).equals(Collections.singletonList(unsent)),
            "Known unsubmitted envelope can supply retry candidates");
        for (MailRetryDisposition disposition : Arrays.asList(MailRetryDisposition.DUPLICATE_RISK,
                MailRetryDisposition.CALLER_POLICY_REQUIRED, MailRetryDisposition.DO_NOT_RETRY)) {
            check(FieldGuideExamples.recipientsSafeToRetry(receipt(MailSubmissionStatus.UNKNOWN,
                disposition, Collections.singletonList(unsent))).isEmpty(),
                "Unsafe or insufficient advice must not supply automatic retry candidates");
        }
        verifyShutdown(true);
        verifyShutdown(false);
        verifyCapabilities();
        verifyReplacement(true);
        verifyReplacement(false);
        System.out.println("PASS: recipient decisions, shutdown order, unknown/absent/present SMTPUTF8 and verified/rejected replacement credentials (12 checks); no SMTP");
    }

    private static SmtpConnectionReport connectionReport(boolean authenticated, SmtpCapabilities capabilities) {
        return SmtpConnectionReport.builder().host("localhost").port(587).protocol("smtp")
            .startedAt(Instant.EPOCH).completedAt(Instant.EPOCH).supported(true).connected(true)
            .authenticationRequested(true).authenticated(authenticated).beforeTls(capabilities)
            .warnings(Collections.emptyList()).build();
    }

    private static void verifyCapabilities() {
        check(FieldGuideExamples.advertisesSmtpUtf8(connectionReport(true, null)).isEmpty(),
            "Missing capability snapshot is unknown, not false");
        check(!FieldGuideExamples.advertisesSmtpUtf8(connectionReport(true,
            new SmtpCapabilities(Collections.emptyMap()))).orElseThrow(), "Known absence is false");
        check(FieldGuideExamples.advertisesSmtpUtf8(connectionReport(true, new SmtpCapabilities(
            Collections.singletonMap("SMTPUTF8", Collections.singletonList(""))))).orElseThrow(),
            "Known advertisement is true");
    }

    private static void verifyReplacement(boolean authenticated) {
        Mailer.Sync sync = (Mailer.Sync) Proxy.newProxyInstance(Mailer.Sync.class.getClassLoader(),
            new Class<?>[] { Mailer.Sync.class }, (proxy, method, arguments) -> {
                check(method.getName().equals("probeConnection") && arguments.length == 1
                    && Boolean.TRUE.equals(arguments[0]), "Credential verification must request authentication");
                return connectionReport(authenticated, null);
            });
        Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(),
            new Class<?>[] { Mailer.class }, (proxy, method, arguments) -> {
                check(method.getName().equals("sync"), "Probe example must not send mail");
                return sync;
            });
        boolean refused = false;
        try {
            FieldGuideExamples.verifyReplacement(mailer);
        } catch (IllegalStateException expected) {
            refused = true;
        }
        check(refused != authenticated, "Unverified credentials must not release the route");
    }

    private static void verifyShutdown(boolean callbacksFinished) throws Exception {
        List<String> order = new ArrayList<>();
        Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[] { Mailer.class },
            (proxy, method, args) -> {
                if (!method.getName().equals("close")) throw new AssertionError("Unexpected Mailer method: " + method);
                order.add("close");
                return null;
            });
        AbstractExecutorService executor = new AbstractExecutorService() {
            public void shutdown() { order.add("shutdown"); }
            public List<Runnable> shutdownNow() { throw new AssertionError("Callbacks must not be discarded"); }
            public boolean isShutdown() { return order.contains("shutdown"); }
            public boolean isTerminated() { return callbacksFinished; }
            public boolean awaitTermination(long timeout, TimeUnit unit) {
                check(timeout == 30 && unit == TimeUnit.SECONDS, "Explicit callback timeout");
                order.add("await");
                return callbacksFinished;
            }
            public void execute(Runnable command) { throw new AssertionError("No new callback work"); }
        };
        boolean pendingReported = false;
        try {
            FieldGuideExamples.stopSending(() -> order.add("stop-dispatch"), mailer, executor);
        } catch (IllegalStateException expected) {
            pendingReported = true;
        }
        check(pendingReported != callbacksFinished, "Pending callbacks must be reported, not silently lost");
        check(order.equals(Arrays.asList("stop-dispatch", "close", "shutdown", "await")), "Shutdown order");
    }

    private static MailRecipientResult recipient(String address, MailRecipientDisposition disposition) {
        return new MailRecipientResult(address, address, disposition, null, null);
    }
    private static MailSubmissionReceipt receipt(MailSubmissionStatus status, MailRetryDisposition retry,
            List<MailRecipientResult> recipients) {
        return new MailSubmissionReceipt(null, null, Instant.EPOCH, status, recipients, retry);
    }
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
