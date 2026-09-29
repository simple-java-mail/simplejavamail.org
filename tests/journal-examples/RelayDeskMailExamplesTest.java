import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.email.config.OpenPgpSigningConfig;
import org.simplejavamail.api.email.config.OpenPgpReceiveConfig;
import org.simplejavamail.api.mailer.MailRecipientResult;
import org.simplejavamail.api.mailer.MailRecipientDisposition;
import org.simplejavamail.api.mailer.MailRetryDisposition;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.api.mailer.SmtpConnectionReport;
import org.simplejavamail.api.mailer.SmtpServerResponse;
import org.simplejavamail.converter.EmailConverter;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.config.ConfigLoader;

import java.time.Instant;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.simplejavamail.recipient.RecipientBuilder.to;
import static org.simplejavamail.recipient.RecipientBuilder.cc;
import static org.simplejavamail.recipient.RecipientBuilder.bcc;
import static org.simplejavamail.api.mailer.MailRetryDisposition.*;
import static org.simplejavamail.api.mailer.MailRecipientDisposition.*;

/** Offline preparation and synthetic result checks. Only public test keys; no SMTP connections. */
public final class RelayDeskMailExamplesTest {
    private static int checks;

    public static void main(String[] args) throws Exception {
        SimpleJavaMail mail = SimpleJavaMail.withConfig(ConfigLoader.builder().load());
        UUID conversation = UUID.fromString("e5039a2b-37b3-4200-9cb1-a7d3530b70a7");
        UUID firstAttempt = UUID.fromString("25a4f7f0-6f52-4bd6-9d0b-8b623ce50e62");
        UUID retryAttempt = UUID.fromString("4125c98a-22d4-4c0d-b233-5c8d4862f1fa");
        Email first = reply(mail, conversation, firstAttempt);
        Email retry = reply(mail, conversation, retryAttempt);

        check(first.getId().equals("<" + firstAttempt + "@mail.relaydesk.com>"),
            "Fix the Message-ID before submission");
        check(!first.getId().equals(retry.getId()), "Retries get distinct attempt IDs");
        check(first.getFromRecipient().getAddress().equals("support@kestrel-outfitters.com"),
            "Use the approved customer sender");
        check(first.getReplyToRecipients().size() == 1, "One approved reply route");
        check(first.getReplyToRecipients().get(0).getAddress().equals(
            "ticket+" + conversation + "@replies.kestrel-outfitters.com"),
            "Human replies identify the conversation");
        check(first.getReplyToRecipients().equals(retry.getReplyToRecipients()),
            "A retry stays in the same conversation");
        check(first.getBounceToRecipient().getAddress().equals(
            "bounce+" + firstAttempt + "@bounces.kestrel-outfitters.com"),
            "Bounces identify the original attempt");
        check(!first.getBounceToRecipient().equals(retry.getBounceToRecipient()),
            "Do not confuse a retry's bounce with the previous attempt");
        check(first.getRecipients().get(0).getAddress().equals("shopper@recipient.invalid"),
            "Preserve the intended recipient");
        check(first.getPlainText().equals("Your parcel is waiting at the collection point."),
            "Preserve the reply content");

        DeliveryStatusNotification dsn = first.getDeliveryStatusNotification();
        check(dsn.getReturnOption() == DeliveryStatusNotification.ReturnOption.HEADERS_ONLY,
            "Request headers rather than another copy of the content");
        check(dsn.getNotifyOptions().size() == 2
            && dsn.getNotifyOptions().contains(DeliveryStatusNotification.NotifyOption.FAILURE)
            && dsn.getNotifyOptions().contains(DeliveryStatusNotification.NotifyOption.DELAY),
            "Request failure and delay reports, not read receipts");
        check(dsn.getEnvelopeId().equals(firstAttempt.toString()), "DSN envelope ID identifies the attempt");

        Instant now = Instant.parse("2026-09-27T10:00:00Z");
        for (MailSubmissionStatus status : MailSubmissionStatus.values()) {
            MailSubmissionReceipt receipt = new MailSubmissionReceipt(
                "<effective@recipient.invalid>", null, now, status,
                status == MailSubmissionStatus.ACCEPTED ? List.of("shopper@recipient.invalid") : Collections.emptyList(),
                Collections.emptyList(), Collections.emptyList());
            boolean accepted = status == MailSubmissionStatus.ACCEPTED;
            MailSendOutcome outcome = new MailSendOutcome(first.getId(), receipt.getEmailId(),
                now, now, now, now, accepted, false, receipt,
                accepted ? null : new IllegalStateException("Synthetic " + status));
            assertRecordedUnchanged(first.getId(), outcome);
        }

        MailSendOutcome preparationFailure = new MailSendOutcome(first.getId(), null,
            now, null, null, now, false, false, null, new IllegalArgumentException("Synthetic preparation failure"));
        assertRecordedUnchanged(first.getId(), preparationFailure);
        check(preparationFailure.getStartedAt().isEmpty(), "A pre-send failure has no start timestamp");
        protectionTests(mail, Path.of(args[0]));
        receiptTests();
        probeTests();
        System.out.println("Passed " + checks + " RelayDesk message/observer checks; no mail sent.");
    }

    private static void protectionTests(SimpleJavaMail mail, Path resources) throws Exception {
        byte[] publicKey = Files.readAllBytes(resources.resolve("openpgpjs/public-key.asc"));
        byte[] privateKey = Files.readAllBytes(resources.resolve("openpgpjs/private-key.asc"));
        OpenPgpSigningConfig signing = OpenPgpSigningConfig.builder().secretKeyRing(privateKey)
                .passphrase("openpgpjs-fixture-passphrase").build();
        List<String> lookups = new ArrayList<>();
        RelayDeskMailExamples.ApprovedOpenPgpKeys keys = new RelayDeskMailExamples.ApprovedOpenPgpKeys() {
            public OpenPgpSigningConfig requireSigningConfig(String customer) {
                if (!customer.equals("kestrel")) throw new IllegalStateException("Tenant not approved");
                return signing;
            }
            public byte[] requireRecipientKey(String customer, String mailbox) {
                if (!customer.equals("kestrel") || mailbox.startsWith("missing")) {
                    throw new IllegalStateException("No approved key for this tenant/recipient");
                }
                lookups.add(mailbox);
                return publicKey;
            }
        };
        Email defaults = mail.emailBuilder().startingBlank().withRecipients(bcc(null, "archive@recipient.invalid"))
                .buildEmail();
        try (Mailer mailer = mail.mailerBuilder().withSMTPServer("127.0.0.1", 1)
                .withConnectionPoolCoreSize(0).withEmailDefaults(defaults).buildMailer()) {
            Email reply = mail.emailBuilder().startingBlank().from("support@kestrel-outfitters.com")
                    .withRecipients(to(null, "buyer@recipient.invalid"), cc(null, "accounts@recipient.invalid"))
                    .withSubject("Wholesale support").withPlainText("Confidential test reply\r\n").buildEmail();
            Email protectedReply = RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", reply, keys);
            check(lookups.containsAll(List.of("buyer@recipient.invalid", "accounts@recipient.invalid", "archive@recipient.invalid")),
                    "Resolve keys for every effective recipient, including configured Bcc");
            check(protectedReply.getOpenPgpSigningConfig() == signing, "Use the approved tenant signing key");
            check(reply.getOpenPgpEncryptionConfig() == null, "Do not mutate ordinary support replies");
            byte[] encrypted = mailer.rehearse(protectedReply).getEmlBytes();
            OpenPgpReceiveConfig receiving = OpenPgpReceiveConfig.builder().addVerificationKeyRing(publicKey)
                    .addDecryptionKeyRing(privateKey, "openpgpjs-fixture-passphrase").build();
            Email decoded = EmailConverter.emlToEmailWithOpenPgp(new ByteArrayInputStream(encrypted), receiving);
            check(decoded.getPlainText().trim().equals("Confidential test reply"), "The example really encrypts a readable PGP/MIME message");
            check(decoded.getOriginalOpenPgpDetails().getSignatureStatus().name().equals("VALID"),
                    "The protected reply has a valid signature");
            boolean tenantBlocked = false;
            try { RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "juniper", reply, keys); }
            catch (IllegalStateException expected) { tenantBlocked = true; }
            check(tenantBlocked, "Juniper cannot borrow Kestrel's keys");
            Email missing = mail.emailBuilder().copying(reply).clearRecipients()
                    .withRecipients(to(null, "missing@recipient.invalid")).buildEmail();
            boolean missingBlocked = false;
            try { RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", missing, keys); }
            catch (IllegalStateException expected) { missingBlocked = true; }
            check(missingBlocked, "A missing approved key stops preparation; no plaintext fallback");

            lookups.clear();
            Email redirected = mail.emailBuilder().copying(reply)
                    .withOverrideReceivers(to(null, "actual@recipient.invalid")).buildEmail();
            Email protectedRedirect = RelayDeskMailExamples.protectWholesaleReply(mail, mailer, "kestrel", redirected, keys);
            check(lookups.equals(List.of("actual@recipient.invalid")), "Key selection follows the actual SMTP envelope");
            check(mailer.rehearse(protectedRedirect).getEnvelopeRecipients().equals(lookups),
                    "Do not lose the approved envelope while copying the message for protection");
        }
    }

    private static void receiptTests() {
        List<MailRecipientResult> recipients = List.of(
                recipient("buyer@recipient.invalid", ACCEPTED, 250),
                recipient("warehouse@recipient.invalid", VALID_UNSENT, 450),
                recipient("former-contact@recipient.invalid", INVALID, 550));
        MailSubmissionReceipt partial = new MailSubmissionReceipt("<test@relaydesk.com>", null, Instant.now(),
                MailSubmissionStatus.PARTIALLY_ACCEPTED, recipients, SAFE_TO_RETRY_UNACCEPTED);
        Feedback feedback = new Feedback();
        RelayDeskMailExamples.presentResult(partial, feedback);
        check(feedback.recipients.equals(recipients), "Ticket retains each recipient's independent result");
        check(feedback.advice == SAFE_TO_RETRY_UNACCEPTED && feedback.candidates.equals(List.of(recipients.get(1))),
                "Only the temporary, unsubmitted recipient is a retry candidate");
        for (MailRetryDisposition advice : List.of(DUPLICATE_RISK, CALLER_POLICY_REQUIRED, DO_NOT_RETRY)) {
            RelayDeskMailExamples.presentResult(new MailSubmissionReceipt("<test@relaydesk.com>", null, Instant.now(),
                    MailSubmissionStatus.UNKNOWN, recipients, advice), feedback);
            check(feedback.advice == advice && feedback.candidates.isEmpty(), "No automatic candidates for " + advice);
        }
        for (Long maximum : new Long[]{10_000_000L, 12_000_000L, 13_000_000L, null}) {
            RelayDeskMailExamples.presentResult(new MailSubmissionReceipt("<test@relaydesk.com>", null, Instant.now(),
                    MailSubmissionStatus.REJECTED, List.of(), CALLER_POLICY_REQUIRED, null, false,
                    12_000_000L, maximum), feedback);
            check(feedback.messageSize.equals(12_000_000L) && java.util.Objects.equals(feedback.maximumSize, maximum),
                    "Keep size facts independently of status, including unknown maximum");
        }
        RelayDeskMailExamples.presentResult(partial, feedback);
        check(feedback.messageSize == null && feedback.maximumSize == null, "Unknown size is not zero or unlimited");
    }

    private static MailRecipientResult recipient(String address, MailRecipientDisposition disposition, int code) {
        return new MailRecipientResult(address, address, disposition, true, new SmtpServerResponse(code, null));
    }

    private static void probeTests() {
        for (boolean authenticated : new boolean[]{true, false}) {
            SmtpConnectionReport report = SmtpConnectionReport.builder().host("127.0.0.1").port(1).protocol("smtp")
                    .startedAt(Instant.now()).completedAt(Instant.now()).supported(true).connected(authenticated)
                    .authenticationRequested(true).authenticated(authenticated).warnings(List.of()).build();
            Mailer.Sync sync = (Mailer.Sync) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[]{Mailer.Sync.class},
                    (proxy, method, args) -> {
                        check(method.getName().equals("probeConnection") && args.length == 1 && Boolean.TRUE.equals(args[0]),
                                "Credential check must request authentication, never send a message");
                        return report;
                    });
            Mailer mailer = (Mailer) Proxy.newProxyInstance(Mailer.class.getClassLoader(), new Class<?>[]{Mailer.class},
                    (proxy, method, args) -> {
                        if (method.getName().equals("sync")) return sync;
                        throw new AssertionError("Unexpected call: " + method.getName());
                    });
            boolean passed = false;
            try { passed = RelayDeskMailExamples.checkCredentials(mailer) == report; }
            catch (IllegalStateException expected) { }
            check(passed == authenticated, "Failed credential checks must keep the route paused");
        }
    }

    private static final class Feedback implements RelayDeskMailExamples.TicketFeedback {
        List<MailRecipientResult> recipients, candidates;
        MailRetryDisposition advice;
        Long messageSize, maximumSize;
        public void showRecipients(List<MailRecipientResult> values) { recipients = values; }
        public void showRetryAdvice(MailRetryDisposition value, List<MailRecipientResult> values) { advice = value; candidates = values; }
        public void showMessageSize(Long size, Long maximum) { messageSize = size; maximumSize = maximum; }
    }

    private static Email reply(SimpleJavaMail mail, UUID conversation, UUID attempt) {
        return RelayDeskMailExamples.prepareKestrelReply(mail.emailBuilder().startingBlank()
            .withRecipients(to(null, "shopper@recipient.invalid"))
            .withSubject("Re: Your parcel")
            .withPlainText("Your parcel is waiting at the collection point."), conversation, attempt);
    }

    private static void assertRecordedUnchanged(String expectedId, MailSendOutcome outcome) {
        AtomicReference<String> storedId = new AtomicReference<>();
        AtomicReference<MailSendOutcome> storedOutcome = new AtomicReference<>();
        RelayDeskMailExamples.observerFor((id, result) -> {
            storedId.set(id);
            storedOutcome.set(result);
        }).onMailSendCompleted(outcome);
        check(expectedId.equals(storedId.get()), "Correlate with the initial, not effective, Message-ID");
        check(outcome == storedOutcome.get(), "Preserve the complete outcome for the application to interpret");
    }

    private static void check(boolean condition, String description) {
        checks++;
        if (!condition) {
            throw new AssertionError(description);
        }
    }
}
