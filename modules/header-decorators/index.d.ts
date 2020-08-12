import { Grid } from '../core';
import { IDecorator } from '../decorators';
export interface IHeaderDecorator extends IDecorator {
    getDecoratorLeft(): number;
}
export interface IHeaderDecoratorCreator {
    makeDecorator?(c: number): IHeaderDecorator;
    annotateDecorator?(h: IHeaderDecorator): void;
    isNeeded?(c: number): boolean;
}
export interface IHeaderDecoratorModel extends IHeaderDecoratorCreator {
    _decorators: {
        [key: number]: IHeaderDecorator | undefined;
    };
    makeDecorator(c: number): IHeaderDecorator;
}
export declare function add(grid: Grid, model?: IHeaderDecoratorCreator): IHeaderDecoratorModel;
export default add;
