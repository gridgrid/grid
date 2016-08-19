var mousewheel = require('../mousewheel');
var debounce = require('../debounce');
var util = require('../util');
var listeners = require('../listeners');

var EVENTS = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'paste'];

var GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end', 'grid-cell-mouse-move'];

var eventLoop = function () {
    var eloop = {
        isRunning: false
    };

    var handlersByName = {};
    var domUnbindFns = [];

    var unbindAll;

    eloop.setContainer = function (container) {
        var unbindMouseWheelFn = mousewheel.bind(container, mainLoop);

        EVENTS.forEach(function (name) {
            bindToDomElement(container, name, mainLoop);
        });

        GRID_EVENTS.forEach(function (name) {
            bindToDomElement(window, name, mainLoop);
        });

        unbindAll = function () {
            unbindMouseWheelFn();

            // have to copy the array since the unbind will actually remove itself from the array which modifies it mid iteration
            domUnbindFns.slice(0).forEach(function (unbind) {
                unbind();
            });

            Object.keys(handlersByName).forEach(function (key) {
                handlersByName[key] = [];
            });
        };
    };

    function getHandlers(name) {
        var handlers = handlersByName[name];
        if (!handlers) {
            handlers = handlersByName[name] = [];
        }
        return handlers;
    }

    function bindToDomElement(elem, name, listener) {
        elem.addEventListener(name, listener);
        var unbindFn = function () {
            elem.removeEventListener(name, listener);
            domUnbindFns.splice(domUnbindFns.indexOf(unbindFn), 1);
        };
        domUnbindFns.push(unbindFn);
        return unbindFn;
    }

    function getHandlerFromArgs(args) {
        var handler = args.filter(function (arg) {
            return typeof arg === 'function';
        })[0];
        return handler;
    }

    eloop.bind = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var name = args.filter(function (arg) {
            return typeof arg === 'string';
        })[0];
        var handler = getHandlerFromArgs(args);
        if (!handler || !name) {
            throw 'cannot bind without at least name and function';
        }


        var elem = args.filter(function (arg) {
            return util.isElement(arg) || arg === window || arg === document;
        })[0];

        if (!elem) {

            handler._eventLoopIdx = getHandlers(name).push(handler) - 1;
            handler._eventLoopUnbound = false;
            return function () {
                if (handler._eventLoopUnbound) {
                    return;
                }
                handler._eventLoopUnbound = true;
                var handlers = getHandlers(name);
                handlers[handler._eventLoopIdx] = null;
                // release the memory but do the expensive work later all at once
                scheduleHandlerCleanUp();
            };
        } else {
            var listener = loopWith(handler);
            // make sure the elem can receive events
            if (elem.style) {
                elem.style.pointerEvents = 'auto';
            }
            return bindToDomElement(elem, name, listener);
        }
    };

    eloop.bindOnce = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        var handler = getHandlerFromArgs(args);
        args.splice(args.indexOf(handler), 1, function bindOnceHandler(e) {
            unbind();
            handler(e);
        });
        var unbind = eloop.bind.apply(this, args);
        return unbind;
    };

    eloop.fire = function (event) {
        event = typeof event === 'string' ? {
            type: event
        } : event;
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

    var scheduleHandlerCleanUp = debounce(function () {
        Object.keys(handlersByName).forEach(function (type) {
            var i = 0;
            handlersByName[type] = handlersByName[type].filter(function (handler) {
                if (!!handler) {
                    handler._eventLoopIdx = i;
                    i++;
                }
                return !!handler;
            });
        });
    }, 1);

    var mainLoop = loopWith(function (e) {
        // have to copy the array because handlers can unbind themselves which modifies the array
        // we use some so that we can break out of the loop if need be
        getHandlers(e.type).slice(0).some(function (handler) {
            if (!handler) {
                return;
            }
            handler(e);
            if (e.gridStopBubbling) {
                return true;
            }
        });
    });

    function loop(e, bodyFn) {
        if (eloop.logTargets) {
            console.log('target', e.target, 'currentTarget', e.currentTarget);
        }
        var isOuterLoopRunning = eloop.isRunning;
        eloop.isRunning = true;
        interceptors.notify(e);
        if (!e.gridStopBubbling) {
            bodyFn(e);
        }

        if (!isOuterLoopRunning) {
            eloop.isRunning = false;
            exitListeners.notify(e);
        }
    }

    eloop.bind('grid-destroy', function () {
        unbindAll();
        eloop.destroyed = true;
    });

    eloop.stopBubbling = function (e) {
        e.gridStopBubbling = true;
        return e;
    };

    return eloop;
};


eventLoop.EVENTS = EVENTS;
eventLoop.GRID_EVENTS = GRID_EVENTS;
module.exports = eventLoop;
