import { AbstractRowColModel, IColDescriptor } from '../abstract-row-col-model';
import { Grid } from '../core';
export declare class ColModel extends AbstractRowColModel {
    width: (idx: number) => number;
    col: (idx: number) => IColDescriptor;
}
export declare function create(grid: Grid): ColModel;
export default create;
