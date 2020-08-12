"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(name, bubbles, cancelable, detail) {
    if (cancelable === void 0) { cancelable = false; }
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
}
exports.default = default_1;
//# sourceMappingURL=index.js.map