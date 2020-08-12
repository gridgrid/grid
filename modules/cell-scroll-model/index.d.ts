import { Grid } from '../core';
export interface ICellScrollDimension {
    position: number;
    scrollTo(position: number, dontFire?: boolean): boolean;
    getPixelScroll(): number;
    getScrollIntoViewCell(dataCell: number): number;
}
export interface ICellScrollModel {
    col: number;
    row: number;
    rowInfo: ICellScrollDimension;
    colInfo: ICellScrollDimension;
    isDirty(): void;
    scrollTo(r: number, c: number, dontFire?: boolean, dontNotifyPixelModel?: boolean): void;
    scrollIntoView(dataRow: number, dataCol: number): void;
}
export declare function create(grid: Grid): ICellScrollModel;
export default create;
