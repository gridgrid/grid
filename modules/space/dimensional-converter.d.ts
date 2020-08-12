import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { IGridDimension } from '../core';
export declare type DimensionalSpaceCoordConverter = (spaceCoord: number) => number;
export interface IIndexOpts {
    from?: number;
    to?: number;
    length?: number;
    reverse?: boolean;
}
export declare abstract class AbstractDimensionalSpaceConverter<T extends IColDescriptor | IRowDescriptor> {
    gridDimension: IGridDimension;
    constructor(gridDimension: IGridDimension);
    abstract toVirtual(spaceCoord: number): number;
    abstract toView(spaceCoord: number): number;
    abstract toData(spaceCoord: number): number;
    abstract count(): number;
    clamp(idx: number): number;
    prev(coord: number): number | undefined;
    next(coord: number): number | undefined;
    get(coord: number): T;
    indexes(opts?: IIndexOpts): number[];
    iterate(opts: IIndexOpts, fn: (idx: number) => boolean | undefined): void;
    iterate(fn: (idx: number) => boolean | undefined): void;
    private iterateWhileHidden;
}
