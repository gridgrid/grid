import { Grid } from '../core';
import { IDecorator } from '../decorators';
export interface IShowHiddenCols {
    _decorators: {
        [key: number]: IDecorator | undefined;
    };
}
export declare function create(grid: Grid): IShowHiddenCols;
export default create;
