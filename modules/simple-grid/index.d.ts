import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { ColModel } from '../col-model';
import { Grid, IGridOpts } from '../core';
import { RowModel } from '../row-model';
import { ISimpleDataModel } from '../simple-data-model';
export interface ISimpleGrid extends Grid {
    dataModel: ISimpleDataModel;
    rowModel: ISimpleRowModel;
    colModel: ISimpleColModel;
}
export interface ISimpleGridRow extends IRowDescriptor {
    dataRow: number;
    dataLayer?: number;
}
export interface ISimpleGridCol extends IColDescriptor {
    dataCol: number;
}
export interface ISimpleRowModel extends RowModel {
    row: (idx: number) => ISimpleGridRow;
    get(idx: number): ISimpleGridRow;
    create(): ISimpleGridRow;
}
export interface ISimpleColModel extends ColModel {
    col: (idx: number) => ISimpleGridCol;
    get(idx: number): ISimpleGridCol;
    create(): ISimpleGridCol;
}
export declare function create(numRows: number, numCols: number, varyHeights?: number[], varyWidths?: number[], fixedRows?: number, fixedCols?: number, preSetupFn?: (grid: Grid) => void, headerRows?: number, headerCols?: number, opts?: IGridOpts): ISimpleGrid;
export default create;
