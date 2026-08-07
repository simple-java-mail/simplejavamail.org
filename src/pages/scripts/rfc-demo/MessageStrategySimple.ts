import {MessageStrategy} from "./MessageStrategy.js";
import {Email} from "./Email.js";

export class MessageStrategySimple extends MessageStrategy {
  
  compatibleWithEmail(email: Email): boolean {
		return !MessageStrategy.emailContainsMixedContent(email) &&
      !MessageStrategy.emailContainsRelatedContent(email) &&
      !MessageStrategy.emailContainsAlternativeContent(email);
	}
	
	public determineMessageStructure(email: Email): string {
    return "<ul>" +
      (email.usePlainText ? "<li class=\"indent\">plain text (root)</li>" : "") +
      (email.useHTMLText ? "<li class=\"indent\">HTML (root)</li>" : "") +
      (email.useCalendarEvent ? "<li class=\"indent\">iCalendar (root)</li>" : "") +
      "     </ul>";
	}
}
