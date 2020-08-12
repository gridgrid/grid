"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function create() {
    var listeners = [];
    return {
        addListener: function (fn) {
            listeners.push(fn);
            return function () {
                listeners.splice(listeners.indexOf(fn), 1);
            };
        },
        notify: function (e) {
            listeners.forEach(function (listener) {
                listener(e);
            });
        }
    };
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map