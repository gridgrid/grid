"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debounce_1 = require("../debounce");
var listeners_1 = require("../listeners");
var mousewheel_1 = require("../mousewheel");
var util = require("../util");
exports.EVENTS = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'paste'];
exports.GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end', 'grid-cell-mouse-move'];
var GridCustomMouseEvents = {
    'grid-drag': true,
    'grid-cell-drag': true,
    'grid-drag-start': true,
    'grid-drag-end': true,
    'grid-cell-mouse-move': true,
};
exports.isAnnotatedGridCustomMouseEvent = function (e) { return !!GridCustomMouseEvents[e.type]; };
exports.ANNOTATED_MOUSE_EVENTS = {
    click: true,
    dblclick: true,
    mousedown: true,
    mousemove: true,
    mouseup: true,
};
exports.ANNOTATED_MOUSE_EVENTS_MAP = exports.ANNOTATED_MOUSE_EVENTS;
exports.isAnnotatedMouseEvent = function (e) { return !!exports.ANNOTATED_MOUSE_EVENTS_MAP[e.type]; };
exports.isAnnotatedMouseEventOfType = function (e, type) {
    return type === e.type;
};
exports.ANNOTATED_KEY_EVENTS = {
    keydown: true,
    keypress: true,
    keyup: true,
};
exports.ANNOTATED_KEY_EVENTS_MAP = exports.ANNOTATED_KEY_EVENTS;
exports.isAnnotatedKeyEvent = function (e) { return !!exports.ANNOTATED_KEY_EVENTS_MAP[e.type]; };
exports.isAnnotatedMouseOrKeyEvent = function (e) {
    return exports.isAnnotatedKeyEvent(e) ||
        exports.isAnnotatedMouseEvent(e);
};
exports.isAnnotatedEvent = function (e) {
    return exports.isAnnotatedMouseOrKeyEvent(e) ||
        exports.isAnnotatedGridCustomMouseEvent(e);
};
function create() {
    var handlersByName = {};
    var domUnbindFns = [];
    var interceptors = listeners_1.default();
    var exitListeners = listeners_1.default();
    var unbindAll;
    var eloop = {
        isRunning: false,
        destroyed: false,
        setContainer: function (container) {
            var unbindMouseWheelFn = mousewheel_1.default.bind(container, mainLoop);
            exports.EVENTS.forEach(function (name) {
                bindToDomElement(container, name, mainLoop);
            });
            exports.GRID_EVENTS.forEach(function (name) {
                bindToDomElement(window, name, mainLoop);
            });
            unbindAll = function () {
                unbindMouseWheelFn();
                domUnbindFns.slice(0).forEach(function (unbind) {
                    unbind();
                });
                Object.keys(handlersByName).forEach(function (key) {
                    handlersByName[key] = [];
                });
            };
        },
        bind: function () {
            var args = Array.prototype.slice.call(arguments, 0);
            var name = args.filter(function (arg) {
                return typeof arg === 'string';
            })[0];
            var handler = getHandlerFromArgs(args);
            if (!handler || !name) {
                throw new Error('cannot bind without at least name and function');
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
                    if (handler._eventLoopIdx != undefined) {
                        handlers[handler._eventLoopIdx] = null;
                    }
                    scheduleHandlerCleanUp();
                };
            }
            else {
                var listener = loopWith(handler);
                if (util.isElementWithStyle(elem)) {
                    elem.style.pointerEvents = 'auto';
                }
                return bindToDomElement(elem, name, listener);
            }
        },
        bindOnce: function () {
            var args = Array.prototype.slice.call(arguments, 0);
            var handler = getHandlerFromArgs(args);
            args.splice(args.indexOf(handler), 1, function bindOnceHandler(e) {
                unbind();
                handler(e);
            });
            var unbind = eloop.bind.apply(this, args);
            return unbind;
        },
        fire: function (event) {
            event = typeof event === 'string' ? {
                type: event
            } : event;
            mainLoop(event);
        },
        addInterceptor: interceptors.addListener,
        addExitListener: exitListeners.addListener,
        stopBubbling: function (e) {
            e.gridStopBubbling = true;
            return e;
        }
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
    function loopWith(fn) {
        return function (e) {
            loop(e, fn);
        };
    }
    var scheduleHandlerCleanUp = debounce_1.default(function () {
        Object.keys(handlersByName).forEach(function (type) {
            var i = 0;
            var handlers = handlersByName[type];
            if (!handlers) {
                return;
            }
            handlersByName[type] = handlers.filter(function (handler) {
                if (!!handler) {
                    handler._eventLoopIdx = i;
                    i++;
                }
                return !!handler;
            });
        });
    }, 1);
    var mainLoop = loopWith(function (e) {
        getHandlers(e.type).slice(0).some(function (handler) {
            if (!handler) {
                return false;
            }
            handler(e);
            if (e.gridStopBubbling) {
                return true;
            }
            return false;
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
    return eloop;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map