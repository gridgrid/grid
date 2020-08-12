import { Grid } from '../core';
import { IDecorator } from '../decorators';
import { AnnotatedMouseEventUnion, IGridDragStartEvent } from '../event-loop';
export interface ITargetCol extends IDecorator {
    _renderedElem?: HTMLElement;
    moveAfter?: boolean;
}
export interface IDragRect extends IDecorator {
    colOffset: number;
}
export interface IColReorder {
    _targetCol?: ITargetCol;
    _dragRects: IDragRect[];
    _onMousedown(e: AnnotatedMouseEventUnion): void;
    _onDragStart(e: IGridDragStartEvent): void;
    _unbindKeyDown?(): void;
    _unbindDrag?(): void;
    _unbindDragEnd?(): void;
}
export declare function create(grid: Grid): IColReorder;
export default create;
