import { Grid } from '../core';
import { IGridDataChangeBody } from '../data-model';
import { IDecorator } from '../decorators';
import { AnnotatedMouseOrKeyEventUnion, EventUnion } from '../event-loop';
export interface IEditDecorator extends IDecorator {
    typedText?(): string;
}
export interface IDefaultEditDecorator extends IEditDecorator {
    renderedElem?: HTMLTextAreaElement;
}
export declare type ClosePromise = Promise<void>;
export declare type SavePromise = Promise<IGridDataChangeBody<any> | undefined>;
export interface IEditor {
    closePromise?: ClosePromise;
    decorator?: false | IEditDecorator;
    save?(): SavePromise;
    isInMe?(e: MouseEvent): boolean;
    removeEscapeStackHandler?(): void;
    removeClickOffHandler?(): void;
}
export interface IEditOptions {
    headers: boolean;
    editTriggers: EditTrigger[];
    saveTriggers: SaveTrigger[];
    cancelTriggers: CancelTrigger[];
    action?(): ClosePromise | undefined;
    getEditor(r: number, originalEvent: AnnotatedMouseOrKeyEventUnion): IEditor;
}
export declare enum Trigger {
    Click = "click",
    Space = "space",
    Enter = "enter",
    Dblclick = "dblclick",
    Typing = "typing",
    Tab = "tab",
    Clickoff = "clickoff",
    Escape = "escape"
}
export declare type EditTrigger = Trigger.Click | Trigger.Dblclick | Trigger.Space | Trigger.Enter | Trigger.Typing;
export declare type SaveTrigger = Trigger.Tab | Trigger.Enter | Trigger.Escape | Trigger.Clickoff;
export declare type CancelTrigger = Trigger.Escape | Trigger.Clickoff;
export declare type EditEventUnion = 'moop';
export interface IEditModel {
    editing: boolean;
    savePromise?: SavePromise;
    currentEditor?: IEditor;
    _defaultDecorator: IDefaultEditDecorator;
    _hydrateOpts(opts?: Partial<IEditOptions>): IEditOptions;
    _interceptor(e: EventUnion): void;
    _closeEditor(): void;
    deleteSelection(): void;
    editCell(r: number, c: number, isTyping: boolean, originalEvent: AnnotatedMouseOrKeyEventUnion): void;
    cancelEdit(): void;
    saveEdit(): SavePromise;
}
export declare function create(grid: Grid): IEditModel;
export default create;
