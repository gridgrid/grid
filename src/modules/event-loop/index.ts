import * as util from '@grid/util';

const mousewheel = require('../mousewheel');
const debounce = require('../debounce');
const listeners = require('../listeners');

export const EVENTS: Array<keyof HTMLElementEventMap> =
    ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'paste'];

export const GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end', 'grid-cell-mouse-move'];

type WindowEventHandler<K extends keyof WindowEventMap> = (this: Window, ev: WindowEventMap[K]) => any;
type DocumentEventHandler<K extends keyof DocumentEventMap> = (this: Document, ev: DocumentEventMap[K]) => any;
type HTMLElementEventHandler<K extends keyof HTMLElementEventMap> = (this: HTMLElement, ev: HTMLElementEventMap[K]) => any;
type LoopEventHandler = (this: void, ev: ILoopEvent) => any;

interface ILoopEvent {
    type: string;
    gridStopBubbling?: boolean;
}

interface IEventHandler extends LoopEventHandler {
    _eventLoopIdx?: number;
    _eventLoopUnbound?: boolean;
}

type EventHandlerUnbinder = () => void;
type BindTarget = HTMLElement | Window | Document;

interface IBind {
    bind(name: string, handler: IEventHandler): EventHandlerUnbinder;
    bind<K extends keyof WindowEventMap>(
        elem: Window,
        name: K,
        handler: WindowEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof DocumentEventMap>(
        elem: Document,
        name: K,
        handler: DocumentEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof HTMLElementEventMap>(
        elem: HTMLElement,
        name: K,
        handler: HTMLElementEventHandler<K>
    ): EventHandlerUnbinder;
    bind(elem: BindTarget, name: string, handler: IEventHandler): EventHandlerUnbinder;
}

// tslint:disable-next-line:interface-over-type-literal
type BindOnce<T> = {
    bindOnce: T[keyof T];
};
interface IEventLoop extends IBind {
    isRunning: boolean;
    destroyed: boolean;
    logTargets?: boolean;
    setContainer(c: HTMLElement): void;
    fire(event: string | ILoopEvent): void;
    addInterceptor(h: IEventHandler): () => EventHandlerUnbinder;
    addExitListener(h: IEventHandler): () => EventHandlerUnbinder;
    stopBubbling(e: ILoopEvent): ILoopEvent;
}
export type EventLoop = IEventLoop & BindOnce<IBind>;

export function create() {
    const handlersByName: { [key: string]: Array<IEventHandler | null> | undefined } = {};
    const domUnbindFns: EventHandlerUnbinder[] = [];
    const interceptors = listeners();
    const exitListeners = listeners();

    let unbindAll: () => void;

    const eloop: EventLoop = {
        isRunning: false,
        destroyed: false,
        setContainer(container: HTMLElement) {
            const unbindMouseWheelFn = mousewheel.bind(container, mainLoop);

            EVENTS.forEach((name) => {
                bindToDomElement(container, name, mainLoop);
            });

            GRID_EVENTS.forEach((name) => {
                bindToDomElement(window, name, mainLoop);
            });

            unbindAll = () => {
                unbindMouseWheelFn();

                // have to copy the array since the unbind will actually remove itself from the array which modifies it mid iteration
                domUnbindFns.slice(0).forEach((unbind) => {
                    unbind();
                });

                Object.keys(handlersByName).forEach((key) => {
                    handlersByName[key] = [];
                });
            };
        },
        // tslint:disable-next-line:only-arrow-functions object-literal-shorthand
        bind: function () {
            const args: any[] = Array.prototype.slice.call(arguments, 0);
            const name: string = args.filter((arg) => {
                return typeof arg === 'string';
            })[0];
            const handler = getHandlerFromArgs(args);
            if (!handler || !name) {
                throw new Error('cannot bind without at least name and function');
            }

            const elem: BindTarget = args.filter((arg) => {
                return util.isElement(arg) || arg === window || arg === document;
            })[0];

            if (!elem) {

                handler._eventLoopIdx = getHandlers(name).push(handler) - 1;
                handler._eventLoopUnbound = false;
                return () => {
                    if (handler._eventLoopUnbound) {
                        return;
                    }
                    handler._eventLoopUnbound = true;
                    const handlers = getHandlers(name);
                    if (handler._eventLoopIdx != undefined) {
                        handlers[handler._eventLoopIdx] = null;
                    }
                    // release the memory but do the expensive work later all at once
                    scheduleHandlerCleanUp();
                };
            } else {
                const listener = loopWith(handler);
                // make sure the elem can receive events
                if (util.isElementWithStyle(elem)) {
                    elem.style.pointerEvents = 'auto';
                }
                return bindToDomElement(elem, name, listener);
            }
        },
        // tslint:disable-next-line:only-arrow-functions object-literal-shorthand
        bindOnce: function (this: any) {
            const args = Array.prototype.slice.call(arguments, 0);
            const handler = getHandlerFromArgs(args);
            args.splice(args.indexOf(handler), 1, function bindOnceHandler(e: ILoopEvent) {
                unbind();
                handler(e);
            });
            const unbind = eloop.bind.apply(this, args);
            return unbind;
        },
        fire: (event) => {
            event = typeof event === 'string' ? {
                type: event
            } : event;
            mainLoop(event);
        },
        addInterceptor: interceptors.addListener,
        addExitListener: exitListeners.addListener,
        stopBubbling(e: ILoopEvent) {
            e.gridStopBubbling = true;
            return e;
        }
    };

    function getHandlers(name: string) {
        let handlers = handlersByName[name];
        if (!handlers) {
            handlers = handlersByName[name] = [];
        }
        return handlers;
    }

    function bindToDomElement(elem: BindTarget, name: string, listener: EventListener) {
        elem.addEventListener(name, listener);
        const unbindFn = () => {
            elem.removeEventListener(name, listener);
            domUnbindFns.splice(domUnbindFns.indexOf(unbindFn), 1);
        };
        domUnbindFns.push(unbindFn);
        return unbindFn;
    }

    function getHandlerFromArgs(args: any[]) {
        const handler: IEventHandler = args.filter((arg) => {
            return typeof arg === 'function';
        })[0];
        return handler;
    }

    function loopWith(fn: (e: ILoopEvent) => void) {
        return (e: ILoopEvent) => {
            loop(e, fn);
        };
    }

    const scheduleHandlerCleanUp = debounce(() => {
        Object.keys(handlersByName).forEach((type) => {
            let i = 0;
            const handlers = handlersByName[type];
            if (!handlers) {
                return;
            }
            handlersByName[type] = handlers.filter((handler) => {
                if (!!handler) {
                    handler._eventLoopIdx = i;
                    i++;
                }
                return !!handler;
            });
        });
    }, 1);

    const mainLoop = loopWith((e) => {
        // have to copy the array because handlers can unbind themselves which modifies the array
        // we use some so that we can break out of the loop if need be
        getHandlers(e.type).slice(0).some((handler) => {
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

    function loop(e: ILoopEvent, bodyFn: (e: ILoopEvent) => void) {
        if (eloop.logTargets) {
            console.log('target', (e as any).target, 'currentTarget', (e as any).currentTarget);
        }
        const isOuterLoopRunning = eloop.isRunning;
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

    eloop.bind('grid-destroy', () => {
        unbindAll();
        eloop.destroyed = true;
    });

    return eloop;
}

export default create;