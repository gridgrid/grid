import { Grid } from '../core';
import { EventUnion } from '../event-loop';
export interface ICellKeyboardModel {
    _annotateEvent(e: EventUnion): void;
}
export declare function create(grid: Grid): ICellKeyboardModel;
export default create;
