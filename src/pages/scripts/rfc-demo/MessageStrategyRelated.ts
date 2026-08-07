import {Email} from "./Email.js";
import {MessageStrategy} from "./MessageStrategy.js";

export class MessageStrategyRelated extends MessageStrategy {
  compatibleWithEmail(email: Email): boolean {
		return !MessageStrategy.emailContainsMixedContent(email) &&
      MessageStrategy.emailContainsRelatedContent(email) &&
      !MessageStrategy.emailContainsAlternativeContent(email);
	}
  
  public determineMessageStructure(email: Email): string {
    return "<ul>" +
      "  <li class=\"indent\">related (root)" +
      "     <ul>" +
      "     <li class=\"indent\">HTML</li>" +
      "     <li class=\"indent\">embedded resources</li>" +
      "     </ul>" +
      "   </li>" +
      "</ul>";
  }
}
