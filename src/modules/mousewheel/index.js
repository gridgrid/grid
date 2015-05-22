var EVENT_NAMES = ['mousewheel', 'wheel', 'DOMMouseScroll'];

var api = {
    getDelta: function(event, xaxis) {
        if (event.wheelDelta) { //for everything but firefox
            var delta = event.wheelDeltaY;
            if (xaxis) {
                delta = event.wheelDeltaX;
            }
            return delta;

        } else if (event.detail) { //for firefox pre version 17
            if (event.axis && ((event.axis === 1 && xaxis) || (event.axis === 2 && !xaxis))) {
                return -1 * event.detail * 12;
            }
        } else if (event.deltaX || event.deltaY) {
            if (xaxis) {
                return -1 * event.deltaX;
            } else {
                return -1 * event.deltaY;
            }
        }
        return 0;
    },

    //binds a cross browser normalized mousewheel event, and returns a function that will unbind the listener;
    bind: function(elem, listener) {
        var normalizedListener = function(e) {
            listener(normalizeWheelEvent(e));
        };

        EVENT_NAMES.forEach(function(name) {
            elem.addEventListener(name, normalizedListener);
        });

        return function() {
            EVENT_NAMES.forEach(function(name) {
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
        }
    });

    newEvent.preventDefault = function() {
        newEvent.defaultPrevented = true;
        if (e && e.preventDefault) {
            e.preventDefault();
        }
    };
    return newEvent;
}

module.exports = api;