import { Grid } from '../core';
import { IDirtyClean } from '../dirty-clean';
import { IPartialPositionRange, PositionSpace, PositionUnit } from '../position-range';
export interface IDecorator extends IPartialPositionRange {
    _decoratorDirtyClean?: IDirtyClean;
    fixed?: boolean;
    boundingBox?: HTMLElement;
    render(): HTMLElement;
    postRender?(elem: HTMLElement): void;
}
export interface IDecoratorModel {
    add(decorators: IDecorator | IDecorator[]): void;
    remove(decorators: IDecorator | IDecorator[]): void;
    getAlive(): IDecorator[];
    popAllDead(): IDecorator[];
    isDirty(): boolean;
    create(t?: number, l?: number, h?: number, w?: number, u?: PositionUnit, s?: PositionSpace): IDecorator;
}
export declare function create(grid: Grid): IDecoratorModel;
export default create;
