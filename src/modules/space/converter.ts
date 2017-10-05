import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { Grid } from '../core';
import { RawPositionRange } from '../position-range';
import { CellFn, getArgs, RowFn } from '../range-util';

import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export abstract class AbstractSpaceConverter {
  abstract row: AbstractDimensionalSpaceConverter<IRowDescriptor>;
  abstract col: AbstractDimensionalSpaceConverter<IColDescriptor>;
  up: (coord: number) => number | undefined;
  down: (coord: number) => number | undefined;
  left: (coord: number) => number | undefined;
  right: (coord: number) => number | undefined;
  grid: Grid;
  constructor(grid: Grid) {
    this.grid = grid;
    this.up = (i) => this.row.prev(i);
    this.down = (i) => this.row.next(i);
    this.left = (i) => this.col.prev(i);
    this.right = (i) => this.col.next(i);
  }

  iterate(range: RawPositionRange, cellFn: CellFn<undefined>): void;
  iterate<T>(range: RawPositionRange, rowFn: RowFn<T>, cellFn: CellFn<T>): void;
  iterate<T>() {
    // expects to be called with the space as its this
    const args = getArgs<T>(arguments);
    const range = args.range;
    const rowFn = args.rowFn;
    const cellFn = args.cellFn;

    rowloop: for (let r: number | undefined = range.top; r !== undefined && r < range.top + range.height; r = this.row.next(r)) {
      let rowResult;
      if (rowFn) {
        rowResult = rowFn(r);
      }
      colloop: for (let c: number | undefined = range.left; c !== undefined && c < range.left + range.width; c = this.col.next(c)) {
        if (cellFn) {
          const result = cellFn(r, c, rowResult);
          if (result === false) {
            break rowloop;
          } else if (result === true) {
            break colloop;
          }
        }
      }
    }
  }
}