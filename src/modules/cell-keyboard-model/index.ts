import { Grid } from '../core';
import { AnnotatedKeyEventUnion, EventUnion, isAnnotatedKeyEvent } from '../event-loop';

export interface ICellKeyboardModel {
    // add methods if needed
    _annotateEvent(e: EventUnion): void;
}

export function create(grid: Grid) {

    const _annotateEventFromDataCoords = (e: AnnotatedKeyEventUnion, dataRow: number, dataCol: number) => {
        e.realRow = grid.data.row.toView(dataRow);
        e.realCol = grid.data.col.toView(dataCol);
        e.virtualRow = grid.data.row.toVirtual(dataRow);
        e.virtualCol = grid.data.col.toVirtual(dataCol);
        e.row = dataRow;
        e.col = dataCol;
        return e;
    };

    const _annotateEventInternal = (e: AnnotatedKeyEventUnion) => {
        const dataRow = grid.navigationModel.focus.row;
        const dataCol = grid.navigationModel.focus.col;
        _annotateEventFromDataCoords(e, dataRow, dataCol);
    };

    const annotateEvent = (e: EventUnion) => {
        if (isAnnotatedKeyEvent(e)) {
            _annotateEventInternal(e);
        }
    };
    grid.eventLoop.addInterceptor(annotateEvent);

    const model: ICellKeyboardModel = {
        _annotateEvent: annotateEvent
    };
    return model;
}

export default create;
