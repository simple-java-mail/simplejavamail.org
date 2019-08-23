var MessageStrategy = /** @class */ (function () {
    function MessageStrategy() {
    }
    MessageStrategy.emailContainsMixedContent = function (email) {
        return email.useAttachments || email.useEmailForward;
    };
    MessageStrategy.emailContainsRelatedContent = function (email) {
        return email.useEmbeddedContent;
    };
    MessageStrategy.emailContainsAlternativeContent = function (email) {
        return (email.usePlainText ? 1 : 0) +
            (email.useHTMLText ? 1 : 0) +
            (email.useCalendarEvent ? 1 : 0) > 1;
    };
    return MessageStrategy;
}());
export { MessageStrategy };

//# sourceMappingURL=MessageStrategy.js.map
