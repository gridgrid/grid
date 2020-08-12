import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { Grid } from '../core';
import { RawPositionRange } from '../position-range';
import { CellFn, RowFn } from '../range-util';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';
export declare abstract class AbstractSpaceConverter {
    abstract row: AbstractDimensionalSpaceConverter<IRowDescriptor>;
    abstract col: AbstractDimensionalSpaceConverter<IColDescriptor>;
    up: (coord: number) => number | undefined;
    down: (coord: number) => number | undefined;
    left: (coord: number) => number | undefined;
    right: (coord: number) => number | undefined;
    grid: Grid;
    constructor(grid: Grid);
    iterate(range: RawPositionRange, cellFn: CellFn<undefined>): void;
    iterate<T>(range: RawPositionRange, rowFn: RowFn<T>, cellFn: CellFn<T>): void;
}
