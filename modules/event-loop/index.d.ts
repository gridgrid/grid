import { IRowColEvent } from '../abstract-row-col-model';
export declare const EVENTS: Array<keyof HTMLElementEventMap>;
export declare const GRID_EVENTS: string[];
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
export declare type GridCustomMouseEventMap = {
    'grid-drag': IGridCustomMouseEvent;
    'grid-cell-drag': IGridCustomMouseEvent;
    'grid-drag-start': IGridDragStartEvent;
    'grid-drag-end': IGridCustomMouseEvent;
    'grid-cell-mouse-move': IGridCustomMouseEvent;
};
export declare type GridCustomMouseEventTypes = keyof GridCustomMouseEventMap;
export declare type GridCustomEventMap = GridCustomMouseEventMap & {
    'grid-row-change': IRowColEvent;
    'grid-col-change': IRowColEvent;
};
export declare const isAnnotatedGridCustomMouseEvent: (e: EventUnion) => e is IGridCustomMouseEvent | IGridDragStartEvent;
export declare const ANNOTATED_MOUSE_EVENTS: {
    click: boolean;
    dblclick: boolean;
    mousedown: boolean;
    mousemove: boolean;
    mouseup: boolean;
};
export declare const ANNOTATED_MOUSE_EVENTS_MAP: {
    readonly [key: string]: boolean | undefined;
};
export declare const isAnnotatedMouseEvent: (e: EventUnion) => e is IAnnotatedMouseEvent & MouseEvent;
export declare const isAnnotatedMouseEventOfType: <T extends "click" | "dblclick" | "mousedown" | "mousemove" | "mouseup">(e: EventUnion, type: T) => e is AnnotatedHTMLElementMouseEventMap[T];
export declare const ANNOTATED_KEY_EVENTS: {
    keydown: boolean;
    keypress: boolean;
    keyup: boolean;
};
export declare const ANNOTATED_KEY_EVENTS_MAP: {
    readonly [key: string]: boolean | undefined;
};
export declare const isAnnotatedKeyEvent: (e: EventUnion) => e is IAnnotatedEvent & KeyboardEvent;
export declare const isAnnotatedMouseOrKeyEvent: (e: EventUnion) => e is AnnotatedMouseOrKeyEventUnion;
export declare const isAnnotatedEvent: (e: EventUnion) => e is AnnotatedEventUnion;
export declare type AnnotatedHTMLElementKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & HTMLElementEventMap[K];
};
export declare type AnnotatedHTMLElementMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & HTMLElementEventMap[K];
};
export declare type AnnotatedHTMLElementEventMap = AnnotatedHTMLElementKeyEventMap & AnnotatedHTMLElementMouseEventMap;
export declare type AnnotatedGridCustomMouseEventUnion = GridCustomMouseEventMap[keyof GridCustomMouseEventMap];
export declare type AnnotatedMouseEventUnion = AnnotatedHTMLElementMouseEventMap[keyof AnnotatedHTMLElementMouseEventMap];
export declare type AnnotatedKeyEventUnion = AnnotatedHTMLElementKeyEventMap[keyof AnnotatedHTMLElementKeyEventMap];
export declare type AnnotatedMouseOrKeyEventUnion = AnnotatedMouseEventUnion | AnnotatedKeyEventUnion;
export declare type AnnotatedEventUnion = AnnotatedMouseOrKeyEventUnion | AnnotatedGridCustomMouseEventUnion;
export declare type AnnotatedWindowKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & WindowEventMap[K];
};
export declare type AnnotatedWindowMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & WindowEventMap[K];
};
export declare type AnnotatedWindowEventMap = AnnotatedWindowKeyEventMap & AnnotatedWindowMouseEventMap;
export declare type AnnotatedDocumentKeyEventMap = {
    [K in keyof typeof ANNOTATED_KEY_EVENTS]: IAnnotatedEvent & DocumentEventMap[K];
};
export declare type AnnotatedDocumentMouseEventMap = {
    [K in keyof typeof ANNOTATED_MOUSE_EVENTS]: IAnnotatedMouseEvent & DocumentEventMap[K];
};
export declare type AnnotatedDocumentEventMap = AnnotatedDocumentKeyEventMap & AnnotatedDocumentMouseEventMap;
export declare type AllEventMap = AnnotatedHTMLElementEventMap & HTMLElementEventMap & WindowEventMap & DocumentEventMap & GridCustomEventMap;
export declare type EventUnion = AllEventMap[keyof AllEventMap] | (ILoopEvent & {
    target?: undefined;
});
export declare type WindowEventHandler<K extends keyof WindowEventMap> = (ev: WindowEventMap[K]) => any;
export declare type DocumentEventHandler<K extends keyof DocumentEventMap> = (ev: DocumentEventMap[K]) => any;
export declare type HTMLElementEventHandler<K extends keyof HTMLElementEventMap> = (ev: HTMLElementEventMap[K]) => any;
export declare type AnnotatedWindowEventHandler<K extends keyof AnnotatedWindowEventMap> = (ev: AnnotatedWindowEventMap[K]) => any;
export declare type AnnotatedDocumentEventHandler<K extends keyof AnnotatedDocumentEventMap> = (ev: AnnotatedDocumentEventMap[K]) => any;
export declare type AnnotatedHTMLElementEventHandler<K extends keyof AnnotatedHTMLElementEventMap> = (ev: AnnotatedHTMLElementEventMap[K]) => any;
export declare type GridCustomEventHandler<K extends keyof GridCustomEventMap> = (ev: GridCustomEventMap[K]) => any;
export declare type LoopEventHandler = (ev: ILoopEvent) => any;
export declare type EventUnionHandler = (ev: EventUnion) => any;
export interface ILoopEvent {
    type: string;
    gridStopBubbling?: boolean;
}
export interface IEventHandler extends LoopEventHandler {
    _eventLoopIdx?: number;
    _eventLoopUnbound?: boolean;
}
export declare type EventHandlerUnbinder = () => void;
export declare type BindTarget = HTMLElement | Window | Document;
export interface IBind {
    bind<K extends keyof AnnotatedWindowEventMap>(elem: Window, name: K, handler: AnnotatedWindowEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedDocumentEventMap>(elem: Document, name: K, handler: AnnotatedDocumentEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedHTMLElementEventMap>(elem: HTMLElement, name: K, handler: AnnotatedHTMLElementEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof AnnotatedHTMLElementEventMap>(name: K, handler: AnnotatedHTMLElementEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof GridCustomEventMap>(elem: BindTarget, name: K, handler: GridCustomEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof GridCustomEventMap>(name: K, handler: GridCustomEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof WindowEventMap>(elem: Window, name: K, handler: WindowEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof DocumentEventMap>(elem: Document, name: K, handler: DocumentEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof HTMLElementEventMap>(elem: HTMLElement, name: K, handler: HTMLElementEventHandler<K>): EventHandlerUnbinder;
    bind<K extends keyof HTMLElementEventMap>(name: K, handler: HTMLElementEventHandler<K>): EventHandlerUnbinder;
    bind(name: string, handler: IEventHandler): EventHandlerUnbinder;
}
export declare type BindOnce<T> = {
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
export declare type EventLoop = IEventLoop & BindOnce<IBind>;
export declare function create(): EventLoop;
export default create;
