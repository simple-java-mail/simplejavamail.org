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
var MessageStrategySimple = /** @class */ (function (_super) {
    __extends(MessageStrategySimple, _super);
    function MessageStrategySimple() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MessageStrategySimple.prototype.compatibleWithEmail = function (email) {
        return !MessageStrategy.emailContainsMixedContent(email) &&
            !MessageStrategy.emailContainsRelatedContent(email) &&
            !MessageStrategy.emailContainsAlternativeContent(email);
    };
    MessageStrategySimple.prototype.determineMessageStructure = function (email) {
        return "<ul>" +
            (email.usePlainText ? "<li class=\"indent\">Plain text (root)</li>" : "") +
            (email.useHTMLText ? "<li class=\"indent\">HTML text (root)</li>" : "") +
            (email.useCalendarEvent ? "<li class=\"indent\">iCalendar text (root)</li>" : "") +
            "     </ul>";
    };
    return MessageStrategySimple;
}(MessageStrategy));
export { MessageStrategySimple };

//# sourceMappingURL=MessageStrategySimple.js.map
