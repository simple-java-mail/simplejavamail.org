import {Email} from "./Email.js";
import {MessageStrategy} from "./MessageStrategy.js";

export class MessageStrategyMixed extends MessageStrategy {
  compatibleWithEmail(email: Email): boolean {
		return MessageStrategy.emailContainsMixedContent(email) &&
      !MessageStrategy.emailContainsRelatedContent(email) &&
      !MessageStrategy.emailContainsAlternativeContent(email);
	}
  
  public determineMessageStructure(email: Email): string {
    return "<ul>" +
      "  <li class=\"indent\">mixed (root)" +
      "     <ul>" +
      (email.usePlainText ? "<li class=\"indent\">plain text</li>" : "") +
      (email.useHTMLText ? "<li class=\"indent\">HTML</li>" : "") +
      (email.useCalendarEvent ? "<li class=\"indent\">iCalendar</li>" : "") +
      (email.useEmailForward ? "<li class=\"indent\">forwarded message</li>" : "") +
      (email.useAttachments ? "<li class=\"indent\">attachments</li>" : "") +
      "     </ul>" +
      "   </li>" +
      "</ul>";
  }
}
