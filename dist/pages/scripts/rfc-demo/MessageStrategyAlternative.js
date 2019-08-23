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
var MessageStrategyAlternative = /** @class */ (function (_super) {
    __extends(MessageStrategyAlternative, _super);
    function MessageStrategyAlternative() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MessageStrategyAlternative.prototype.compatibleWithEmail = function (email) {
        return !MessageStrategy.emailContainsMixedContent(email) &&
            !MessageStrategy.emailContainsRelatedContent(email) &&
            MessageStrategy.emailContainsAlternativeContent(email);
    };
    MessageStrategyAlternative.prototype.determineMessageStructure = function (email) {
        return "<ul>" +
            "  <li class=\"indent\">alternative (root)" +
            "     <ul>" +
            (email.usePlainText ? "<li class=\"indent\">Plain text</li>" : "") +
            (email.useHTMLText ? "<li class=\"indent\">HTML text</li>" : "") +
            (email.useCalendarEvent ? "<li class=\"indent\">iCalendar text</li>" : "") +
            "     </ul>" +
            "   </li>" +
            "</ul>";
    };
    return MessageStrategyAlternative;
}(MessageStrategy));
export { MessageStrategyAlternative };

//# sourceMappingURL=MessageStrategyAlternative.js.map
