import { AbstractRowColModel, IRowDescriptor } from '../abstract-row-col-model';
import { Grid } from '../core';
export declare class RowModel extends AbstractRowColModel {
    height: (idx: number) => number;
    row: (idx: number) => IRowDescriptor;
}
export declare function create(grid: Grid): RowModel;
export default create;
