"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EVENT_NAMES = ['mousewheel', 'wheel', 'DOMMouseScroll'];
var api = {
    getDelta: function (event, xaxis) {
        if (event.wheelDelta) {
            var delta = event.wheelDeltaY;
            if (xaxis) {
                delta = event.wheelDeltaX;
            }
            return delta;
        }
        else if (event.detail) {
            var oldFFWheelEvent = event;
            if (oldFFWheelEvent.axis && ((oldFFWheelEvent.axis === 1 && xaxis) || (oldFFWheelEvent.axis === 2 && !xaxis))) {
                return -1 * oldFFWheelEvent.detail * 12;
            }
        }
        else if (event.deltaX || event.deltaY) {
            if (xaxis) {
                return -1 * event.deltaX;
            }
            else {
                return -1 * event.deltaY;
            }
        }
        return 0;
    },
    bind: function (elem, listener) {
        var normalizedListener = function (e) {
            listener(normalizeWheelEvent(e));
        };
        EVENT_NAMES.forEach(function (name) {
            elem.addEventListener(name, normalizedListener);
        });
        return function () {
            EVENT_NAMES.forEach(function (name) {
                elem.removeEventListener(name, normalizedListener);
            });
        };
    },
    normalize: normalizeWheelEvent
};
function normalizeWheelEvent(e) {
    var deltaX = api.getDelta(e, true);
    var deltaY = api.getDelta(e);
    var newEvent = Object.create(e, {
        deltaY: {
            value: deltaY
        },
        deltaX: {
            value: deltaX
        },
        type: {
            value: 'mousewheel'
        },
        target: {
            value: e.target
        },
        currentTarget: {
            value: e.currentTarget
        },
        defaultPrevented: {
            value: false,
            writable: true
        }
    });
    newEvent.preventDefault = function () {
        newEvent.defaultPrevented = true;
        if (e && e.preventDefault) {
            e.preventDefault();
        }
    };
    return newEvent;
}
exports.default = api;
//# sourceMappingURL=index.js.map