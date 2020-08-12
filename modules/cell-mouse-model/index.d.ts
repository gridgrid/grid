import { Grid } from '../core';
import { AnnotatedMouseEventUnion, EventUnion, IAnnotatedEvent, IAnnotatedMouseEvent, IGridCustomMouseEvent } from '../event-loop';
export interface IEventDimensionInfoGetter {
    view(e: IAnnotatedEvent): number;
    virtual(e: IAnnotatedEvent): number;
    data(e: IAnnotatedEvent): number;
    gridPx(e: IAnnotatedMouseEvent): number;
    layerPx(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent): number;
}
export interface ICellMouseModel {
    rowInfo: IEventDimensionInfoGetter;
    colInfo: IEventDimensionInfoGetter;
    _annotateEvent(e: EventUnion): void;
    _annotateEventInternal(e: AnnotatedMouseEventUnion): void;
    _annotateEventFromViewCoords(e: AnnotatedMouseEventUnion, viewRow: number, viewCol: number): EventUnion;
}
export declare function create(grid: Grid): ICellMouseModel;
export default create;
