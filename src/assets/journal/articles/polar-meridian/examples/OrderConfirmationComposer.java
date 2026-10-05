import org.simplejavamail.api.SimpleJavaMail;
import org.simplejavamail.api.email.Email;
import org.simplejavamail.api.mailer.Mailer;
import org.simplejavamail.recipient.RecipientBuilder;

/** Application composition example called by MessagePreparation.compose after permission checks. */
public final class OrderConfirmationComposer {
    private final SimpleJavaMail mail;

    public OrderConfirmationComposer(SimpleJavaMail mail) {
        this.mail = mail;
    }

    /**
     * Both values come from platform configuration, not unchecked request fields.
     * @param mailer SJM Mailer configured for this request's SMTP connection and local execution
     * @param sendingQuotaGroup Dispatcher database limit group, e.g. "eu-application-mail"; never passed to SJM
     */
    public PolarMeridianDispatcher.ComposedMail composeOrderConfirmation(
            OrderConfirmation confirmation, Mailer mailer, String sendingQuotaGroup) {

        Email email = mail.emailBuilder().startingBlank()
                .from("Polar Meridian Orders", "orders@polarmeridian.com")
                .withBounceTo("bounces@polarmeridian.com")
                .withRecipients(RecipientBuilder.to(
                        confirmation.getCustomerName(), confirmation.getCustomerEmail()))
                .withSubject("Confirmation for order " + confirmation.getOrderNumber())
                .withPlainText(
                        "We've received your replacement-parts order "
                        + confirmation.getOrderNumber()
                        + ". You can view its details in the ordering portal.")
                .buildEmail();

        return new PolarMeridianDispatcher.ComposedMail(
                mailer,
                sendingQuotaGroup,
                email,
                PolarMeridianDispatcher.Retention.EXACT_EML);
    }

    /** Data loaded from the stored, authorized order-confirmation request. */
    public static final class OrderConfirmation {
        private final String orderNumber;
        private final String customerName;
        private final String customerEmail;

        public OrderConfirmation(String orderNumber, String customerName, String customerEmail) {
            this.orderNumber = orderNumber;
            this.customerName = customerName;
            this.customerEmail = customerEmail;
        }

        public String getOrderNumber() {
            return orderNumber;
        }

        public String getCustomerName() {
            return customerName;
        }

        public String getCustomerEmail() {
            return customerEmail;
        }
    }
}
