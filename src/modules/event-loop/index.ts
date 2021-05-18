import { IRowColEvent } from '../abstract-row-col-model';
import debounce from '../debounce';
import listeners from '../listeners';
import mousewheel from '../mousewheel';
import * as util from '../util';

export const EVENTS: Array<keyof HTMLElementEventMap> =
    ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'paste'];

export const GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end', 'grid-cell-mouse-move'];

export interface IAnnotatedEvent {
    realRow: number;
    realCol: number;
    virtualRow: number;
    virtualCol: number;
    row: number;
    col: number;
}

export interface IAnnotatedMouseEvent extends IAnnotatedEvent {
    gridX: number;
    gridY: number;
}

export interface IGridCustomMouseEvent extends CustomEvent, IAnnotatedMouseEvent {
    clientX: number;
    clientY: number;
    layerX: number;
    layerY: number;
    originalEvent: AnnotatedMouseEventUnion;
}

export interface IGridDragStartEvent extends IGridCustomMouseEvent {
    enableAutoScroll(): void;
}

// tslint:disable-next-line:interface-over-type-literal
export type GridCustomMouseEventMap = {
    'grid-drag': IGridCustomMouseEvent,
    'grid-cell-drag': IGridCustomMouseEvent,
    'grid-drag-start': IGridDragStartEvent,
    'grid-drag-end': IGridCustomMouseEvent,
    'grid-cell-mouse-move': IGridCustomMouseEvent,
};

const GridCustomMouseEvents: { [key: string]: boolean | undefined } = {
    'grid-drag': true,
    'grid-cell-drag': true,
    'grid-drag-start': true,
    'grid-drag-end': true,
    'grid-cell-mouse-move': true,
};

export type GridCustomMouseEventTypes = keyof GridCustomMouseEventMap;

// tslint:disable-next-line:interface-over-type-literal
export type GridCustomEventMap = GridCustomMouseEventMap & {
    'grid-row-change': IRowColEvent,
    'grid-col-change': IRowColEvent,
};

export const isAnnotatedGridCustomMouseEvent = (e: EventUnion): e is AnnotatedGridCustomMouseEventUnion => !!GridCustomMouseEvents[e.type];

export const ANNOTATED_MOUSE_EVENTS = {
    click: true,
    dblclick: true,
    mousedown: true,
    mousemove: true,
    mouseup: true,
};
export const ANNOTATED_MOUSE_EVENTS_MAP: { readonly [key: string]: boolean | undefined; } = ANNOTATED_MOUSE_EVENTS;
export const isAnnotatedMouseEvent = (e: EventUnion): e is AnnotatedMouseEventUnion => !!ANNOTATED_MOUSE_EVENTS_MAP[e.type];
export const isAnnotatedMouseEventOfType =
    <T extends keyof typeof ANNOTATED_MOUSE_EVENTS>(e: EventUnion, type: T): e is AnnotatedHTMLElementMouseEventMap[T] =>
        type === e.type;

export const ANNOTATED_KEY_EVENTS = {
    keydown: true,
    keypress: true,
    keyup: true,
};
export const ANNOTATED_KEY_EVENTS_MAP: { readonly [key: string]: boolean | undefined; } = ANNOTATED_KEY_EVENTS;
export const isAnnotatedKeyEvent = (e: EventUnion): e is AnnotatedKeyEventUnion => !!ANNOTATED_KEY_EVENTS_MAP[e.type];

export const isAnnotatedMouseOrKeyEvent = (e: EventUnion): e is AnnotatedMouseOrKeyEventUnion =>
    isAnnotatedKeyEvent(e) ||
    isAnnotatedMouseEvent(e);
export const isAnnotatedEvent = (e: EventUnion): e is AnnotatedEventUnion =>
    isAnnotatedMouseOrKeyEvent(e) ||
    isAnnotatedGridCustomMouseEvent(e);

export type AnnotatedHTMLElementKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & HTMLElementEventMap[K];
};

export type AnnotatedHTMLElementMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & HTMLElementEventMap[K];
};

export type AnnotatedHTMLElementEventMap = AnnotatedHTMLElementKeyEventMap & AnnotatedHTMLElementMouseEventMap;
export type AnnotatedGridCustomMouseEventUnion = GridCustomMouseEventMap[keyof GridCustomMouseEventMap];
export type AnnotatedMouseEventUnion = AnnotatedHTMLElementMouseEventMap[keyof AnnotatedHTMLElementMouseEventMap];
export type AnnotatedKeyEventUnion = AnnotatedHTMLElementKeyEventMap[keyof AnnotatedHTMLElementKeyEventMap];
export type AnnotatedMouseOrKeyEventUnion = AnnotatedMouseEventUnion | AnnotatedKeyEventUnion;
export type AnnotatedEventUnion = AnnotatedMouseOrKeyEventUnion | AnnotatedGridCustomMouseEventUnion;

export type AnnotatedWindowKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & WindowEventMap[K];
};

export type AnnotatedWindowMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & WindowEventMap[K];
};

export type AnnotatedWindowEventMap = AnnotatedWindowKeyEventMap & AnnotatedWindowMouseEventMap;

export type AnnotatedDocumentKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & DocumentEventMap[K];
};

export type AnnotatedDocumentMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & DocumentEventMap[K];
};

export type AnnotatedDocumentEventMap = AnnotatedDocumentKeyEventMap & AnnotatedDocumentMouseEventMap;

export type AllEventMap = AnnotatedHTMLElementEventMap & HTMLElementEventMap & WindowEventMap & DocumentEventMap & GridCustomEventMap;
export type EventUnion = AllEventMap[keyof AllEventMap] | (ILoopEvent & { target?: undefined; });

export type WindowEventHandler<K extends keyof WindowEventMap> = (ev: WindowEventMap[K]) => any;
export type DocumentEventHandler<K extends keyof DocumentEventMap> = (ev: DocumentEventMap[K]) => any;
export type HTMLElementEventHandler<K extends keyof HTMLElementEventMap> = (ev: HTMLElementEventMap[K]) => any;
export type AnnotatedWindowEventHandler<K extends keyof AnnotatedWindowEventMap> = (ev: AnnotatedWindowEventMap[K]) => any;
export type AnnotatedDocumentEventHandler<K extends keyof AnnotatedDocumentEventMap> = (ev: AnnotatedDocumentEventMap[K]) => any;
export type AnnotatedHTMLElementEventHandler<K extends keyof AnnotatedHTMLElementEventMap> = (ev: AnnotatedHTMLElementEventMap[K]) => any;
export type GridCustomEventHandler<K extends keyof GridCustomEventMap> = (ev: GridCustomEventMap[K]) => any;
export type LoopEventHandler = (ev: ILoopEvent) => any;
export type EventUnionHandler = (ev: EventUnion) => any;

export interface ILoopEvent {
    type: string;
    gridStopBubbling?: boolean;
}

export interface IEventHandler extends LoopEventHandler {
    _eventLoopIdx?: number;
    _eventLoopUnbound?: boolean;
}

export type EventHandlerUnbinder = () => void;
export type BindTarget = HTMLElement | Window | Document;

export interface IBind {
    bind<K extends keyof AnnotatedWindowEventMap>(
        elem: Window,
        name: K,
        handler: AnnotatedWindowEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedDocumentEventMap>(
        elem: Document,
        name: K,
        handler: AnnotatedDocumentEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedHTMLElementEventMap>(
        elem: HTMLElement,
        name: K,
        handler: AnnotatedHTMLElementEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedHTMLElementEventMap>(
        name: K,
        handler: AnnotatedHTMLElementEventHandler<K>
    ): EventHandlerUnbinder;

    bind<K extends keyof GridCustomEventMap>(
        elem: BindTarget,
        name: K,
        handler: GridCustomEventHandler<K>
    ): EventHandlerUnbinder;
    bind<K extends keyof GridCustomEventMap>(
        name: K,
        handler: GridCustomEventHandler<K>
    ): EventHandlerUnbinder;

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
    bind<K extends keyof HTMLElementEventMap>(
        name: K,
        handler: HTMLElementEventHandler<K>
    ): EventHandlerUnbinder;
    bind(name: string, handler: IEventHandler): EventHandlerUnbinder;
}

// tslint:disable-next-line:interface-over-type-literal
export type BindOnce<T> = {
    bindOnce: T[keyof T];
};

export interface IEventLoop extends IBind {
    isRunning: boolean;
    destroyed: boolean;
    logTargets?: boolean;
    setContainer(c: HTMLElement): void;
    fire(event: string | ILoopEvent): void;
    addInterceptor(h: EventUnionHandler): EventHandlerUnbinder;
    addExitListener(h: EventUnionHandler): EventHandlerUnbinder;
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