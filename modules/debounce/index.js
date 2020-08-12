"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debouncedFnProps = { cancel: function () { } };
function debounce(fn, delay) {
    var f = Object.assign(function debounced() {
        if (f.timeout) {
            clearTimeout(f.timeout);
            f.timeout = undefined;
        }
        if (!f.canceled) {
            f.timeout = window.setTimeout(fn, delay);
        }
        f.cancel = function () {
            if (f.timeout != undefined) {
                clearTimeout(f.timeout);
            }
            f.timeout = undefined;
            f.canceled = true;
        };
    }, debouncedFnProps);
    return f;
}
exports.debounce = debounce;
exports.default = debounce;
//# sourceMappingURL=index.js.map