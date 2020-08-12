import { Grid } from '../core';
import { IDataModel } from '../data-model';
export interface ISimpleDataModel extends IDataModel {
    setHeader(virtualRow: number, virtualCol: number, datum: string[]): void;
}
export declare function create(_grid: Grid): ISimpleDataModel;
export default create;
