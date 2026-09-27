import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.email.config.DeliveryStatusNotification;
import org.simplejavamail.api.mailer.MailSendOutcome;
import org.simplejavamail.api.mailer.MailSubmissionReceipt;
import org.simplejavamail.api.mailer.MailSubmissionStatus;
import org.simplejavamail.config.ConfigLoader;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.simplejavamail.recipient.RecipientBuilder.to;

/** Pure example checks: no Mailers, network connections, secrets or SMTP sends. */
public final class RelayDeskMailExamplesTest {
    private static int checks;

    public static void main(String[] args) {
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
        System.out.println("Passed " + checks + " RelayDesk message/observer checks; no mail sent.");
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
