import {MessageStrategy} from "./MessageStrategy.js";
import {Email} from "./Email.js";

export class MessageStrategyAlternative extends MessageStrategy {
  compatibleWithEmail(email: Email): boolean {
    return !MessageStrategy.emailContainsMixedContent(email) &&
      !MessageStrategy.emailContainsRelatedContent(email) &&
      MessageStrategy.emailContainsAlternativeContent(email);
  }
  
  public determineMessageStructure(email: Email): string {
    return "<ul>" +
      "  <li class=\"indent\">alternative (root)" +
      "     <ul>" +
      (email.usePlainText ? "<li class=\"indent\">plain text</li>" : "") +
      (email.useHTMLText ? "<li class=\"indent\">HTML</li>" : "") +
      (email.useCalendarEvent ? "<li class=\"indent\">iCalendar</li>" : "") +
      "     </ul>" +
      "   </li>" +
      "</ul>";
  }
}
