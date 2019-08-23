import {MessageStrategy} from "./MessageStrategy.js";
import {MessageStrategyAlternative} from "./MessageStrategyAlternative.js";
import {MessageStrategyMixed} from "./MessageStrategyMixed.js";
import {MessageStrategyRelated} from "./MessageStrategyRelated.js";
import {MessageStrategyMixedRelatedAlternative} from "./MessageStrategyMixedRelatedAlternative.js";
import {MessageStrategyRelatedAlternative} from "./MessageStrategyRelatedAlternative.js";
import {MessageStrategyMixedAlternative} from "./MessageStrategyMixedAlternative.js";
import {MessageStrategyMixedRelated} from "./MessageStrategyMixedRelated.js";
import {MessageStrategySimple} from "./MessageStrategySimple.js";
import {Email} from "./Email.js";

export class RfcDemo {
    usePlainText: boolean;
    useHTMLText: boolean;
    useEmbeddedContent: boolean;
    useCalendarEvent: boolean;
    useAttachments: boolean;
    useEmailForward: boolean;

    private static readonly STRATEGIES: Array<MessageStrategy> = [
        new MessageStrategySimple(),
        new MessageStrategyAlternative(),
        new MessageStrategyRelated(),
        new MessageStrategyMixed(),
        new MessageStrategyMixedRelated(),
        new MessageStrategyMixedAlternative(),
        new MessageStrategyRelatedAlternative(),
        new MessageStrategyMixedRelatedAlternative()
    ];

    determineMessageStructure(): string {
        if (!this.useHTMLText) {
            this.useEmbeddedContent = false;
        }

        return RfcDemo.determineFormalStructure(new Email(
            this.usePlainText,
            this.useHTMLText,
            this.useEmbeddedContent,
            this.useCalendarEvent,
            this.useAttachments,
            this.useEmailForward));
    }

    private static determineFormalStructure(email: Email): string {
        for (const s of RfcDemo.STRATEGIES) {
            if (s.compatibleWithEmail(email)) {
                return s.determineMessageStructure(email);
            }
        }
        throw new Error("email config not recognized properly");
    }
}