import {Email} from "./Email.js";
import {MessageStrategy} from "./MessageStrategy.js";

export class MessageStrategyMixedRelated extends MessageStrategy {
  compatibleWithEmail(email: Email): boolean {
		return MessageStrategy.emailContainsMixedContent(email) &&
      MessageStrategy.emailContainsRelatedContent(email) &&
      !MessageStrategy.emailContainsAlternativeContent(email);
	}
  
  public determineMessageStructure(email: Email): string {
    return "<ul>" +
      "   <li class=\"indent\">mixed (root)" +
      "     <ul>" +
      "		    <li class=\"indent\">related" +
      "         <ul>" +
      "			      <li class=\"indent\">HTML</li>" +
      "			      <li class=\"indent\">embedded resources</li>" +
      "		      </ul>" +
      "       </li>" +
      (email.useEmailForward ? "<li class=\"indent\">forwarded message</li>" : "") +
      (email.useAttachments ? "<li class=\"indent\">attachments</li>" : "") +
      "	    </ul>" +
      "   </li>" +
      "</ul>";
  }
}
