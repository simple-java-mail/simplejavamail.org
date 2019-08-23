import { MessageStrategyAlternative } from "./MessageStrategyAlternative.js";
import { MessageStrategyMixed } from "./MessageStrategyMixed.js";
import { MessageStrategyRelated } from "./MessageStrategyRelated.js";
import { MessageStrategyMixedRelatedAlternative } from "./MessageStrategyMixedRelatedAlternative.js";
import { MessageStrategyRelatedAlternative } from "./MessageStrategyRelatedAlternative.js";
import { MessageStrategyMixedAlternative } from "./MessageStrategyMixedAlternative.js";
import { MessageStrategyMixedRelated } from "./MessageStrategyMixedRelated.js";
import { MessageStrategySimple } from "./MessageStrategySimple.js";
import { Email } from "./Email.js";
var RfcDemo = /** @class */ (function () {
    function RfcDemo() {
    }
    RfcDemo.prototype.determineMessageStructure = function () {
        if (!this.useHTMLText) {
            this.useEmbeddedContent = false;
        }
        return RfcDemo.determineFormalStructure(new Email(this.usePlainText, this.useHTMLText, this.useEmbeddedContent, this.useCalendarEvent, this.useAttachments, this.useEmailForward));
    };
    RfcDemo.determineFormalStructure = function (email) {
        for (var _i = 0, _a = RfcDemo.STRATEGIES; _i < _a.length; _i++) {
            var s = _a[_i];
            if (s.compatibleWithEmail(email)) {
                return s.determineMessageStructure(email);
            }
        }
        throw new Error("email config not recognized properly");
    };
    RfcDemo.STRATEGIES = [
        new MessageStrategySimple(),
        new MessageStrategyAlternative(),
        new MessageStrategyRelated(),
        new MessageStrategyMixed(),
        new MessageStrategyMixedRelated(),
        new MessageStrategyMixedAlternative(),
        new MessageStrategyRelatedAlternative(),
        new MessageStrategyMixedRelatedAlternative()
    ];
    return RfcDemo;
}());
export { RfcDemo };

//# sourceMappingURL=rfc-demo.js.map
