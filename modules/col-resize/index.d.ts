import { Grid } from '../core';
import { IDecorator } from '../decorators';
import { AnnotatedMouseEventUnion, IGridDragStartEvent } from '../event-loop';
import { IHeaderDecorator } from '../header-decorators';
export interface IResizeHeader extends IHeaderDecorator {
    _dragLine: IDecorator;
    _onMousedown(e: AnnotatedMouseEventUnion): void;
    _onDragStart(e: IGridDragStartEvent): void;
    _unbindDrag?(): void;
    _unbindKeyDown?(): void;
    _unbindDragEnd?(): void;
}
export interface IColResize {
    annotateDecorator(d: IResizeHeader): void;
}
export declare function create(grid: Grid): IColResize;
export default create;
