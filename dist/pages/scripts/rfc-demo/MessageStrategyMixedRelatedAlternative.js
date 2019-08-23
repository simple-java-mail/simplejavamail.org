var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { MessageStrategy } from "./MessageStrategy.js";
var MessageStrategyMixedRelatedAlternative = /** @class */ (function (_super) {
    __extends(MessageStrategyMixedRelatedAlternative, _super);
    function MessageStrategyMixedRelatedAlternative() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MessageStrategyMixedRelatedAlternative.prototype.compatibleWithEmail = function (email) {
        return MessageStrategy.emailContainsMixedContent(email) &&
            MessageStrategy.emailContainsRelatedContent(email) &&
            MessageStrategy.emailContainsAlternativeContent(email);
    };
    MessageStrategyMixedRelatedAlternative.prototype.determineMessageStructure = function (email) {
        return "<ul>" +
            "   <li class=\"indent\">mixed (root)" +
            "     <ul>" +
            "   	  <li class=\"indent\">related" +
            "         <ul>" +
            "     	  	<li class=\"indent\">alternative" +
            "             <ul>" +
            (email.usePlainText ? "<li class=\"indent\">Plain text</li>" : "") +
            (email.useHTMLText ? "<li class=\"indent\">HTML text</li>" : "") +
            (email.useCalendarEvent ? "<li class=\"indent\">iCalendar text</li>" : "") +
            "             </ul>" +
            "           </li>" +
            "		  	    <li class=\"indent\">embeddable content (ie. images) </li>" +
            "         </ul>" +
            "       </li>" +
            (email.useEmailForward ? "<li class=\"indent\">forwarded email</li>" : "") +
            (email.useAttachments ? "<li class=\"indent\">downloadable attachments</li>" : "") +
            "	    </ul>" +
            "   </li>" +
            "</ul>";
    };
    return MessageStrategyMixedRelatedAlternative;
}(MessageStrategy));
export { MessageStrategyMixedRelatedAlternative };

//# sourceMappingURL=MessageStrategyMixedRelatedAlternative.js.map
