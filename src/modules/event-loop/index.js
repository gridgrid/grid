var mousewheel = require('@grid/mousewheel');
var util = require('@grid/util');
var listeners = require('@grid/listeners');

module.exports = function (_grid) {
    var grid = _grid;
    var eloop = {
        isRunning: false
    };

    var handlersByName = {};

    eloop.setContainer = function (container) {
        var unbindMouseWheelFn = mousewheel.bind(container, mainLoop);
        var EVENTS = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup'];
        EVENTS.forEach(function (name) {
            container.addEventListener(name, mainLoop);
        });
    };

    function getHandlers(name) {
        var handlers = handlersByName[name];
        if (!handlers) {
            handlers = handlersByName[name] = [];
        }
        return handlers;
    }

    eloop.bind = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var name = args.filter(function (arg) {
            return typeof arg === 'string';
        })[0];

        var handler = args.filter(function (arg) {
            return typeof arg === 'function';
        })[0];

        if (!handler || !name) {
            throw 'cannot bind without at least name and function';
        }


        var elem = args.filter(function (arg) {
            return util.isElement(arg);
        })[0];

        if (!elem) {
            getHandlers(name).push(handler);
        } else {
            elem.addEventListener(name, loopWith(handler));
        }
    };

    eloop.fire = function (event) {
        event = typeof event === 'string' ? {type: event} : event;
        mainLoop(event);
    };

    var interceptors = listeners();
    var exitListeners = listeners();

    eloop.addInterceptor = interceptors.addListener;
    eloop.addExitListener = exitListeners.addListener;

    function loopWith(fn) {
        return function (e) {
            loop(e, fn);
        };
    }

    var mainLoop = loopWith(function (e) {
        getHandlers(e.type).forEach(function (handler) {
            handler(e);
        });
    });

    function loop(e, bodyFn) {
        var isOuterLoopRunning = eloop.isRunning;
        eloop.isRunning = true;
        interceptors.notify(e);

        bodyFn(e);
        
        if (!isOuterLoopRunning) {
            eloop.isRunning = false;
            exitListeners.notify(e);
        }
    }

    return eloop;
};