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
var MessageStrategyRelated = /** @class */ (function (_super) {
    __extends(MessageStrategyRelated, _super);
    function MessageStrategyRelated() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MessageStrategyRelated.prototype.compatibleWithEmail = function (email) {
        return !MessageStrategy.emailContainsMixedContent(email) &&
            MessageStrategy.emailContainsRelatedContent(email) &&
            !MessageStrategy.emailContainsAlternativeContent(email);
    };
    MessageStrategyRelated.prototype.determineMessageStructure = function (email) {
        return "<ul>" +
            "  <li class=\"indent\">related (root)" +
            "     <ul>" +
            "     <li class=\"indent\">HTML text</li>" +
            "     <li class=\"indent\">embeddable content (ie. images)</li>" +
            "     </ul>" +
            "   </li>" +
            "</ul>";
    };
    return MessageStrategyRelated;
}(MessageStrategy));
export { MessageStrategyRelated };

//# sourceMappingURL=MessageStrategyRelated.js.map
