import { Grid } from '../core';
export interface IGridDataResult<T> {
    value: T;
    formatted: string;
}
export interface IGridDataChangeBody<T> {
    value: T;
    formatted?: string;
}
export interface IGridDataChange<T> extends IGridDataChangeBody<T> {
    row: number;
    col: number;
    paste?: boolean;
}
export interface IDataModel {
    isDirty(): boolean;
    setDirty(): void;
    handleCachedDataChange(): void;
    get(dataRow: number, dataCol: number, isCopy?: boolean): IGridDataResult<any>;
    getHeader(virtualRow: number, virtualCol: number): IGridDataResult<any>;
    set(dataRow: number, dataCol: number, value: any): void;
    set(changes: Array<IGridDataChange<any>>): void;
    toggleSort?(c: number): void;
}
export declare type RowLoader = (dataRow: number[]) => void;
export declare function create(grid: Grid, loadRows?: RowLoader): IDataModel;
export default create;
