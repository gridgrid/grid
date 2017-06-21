import { Grid } from '../core';

import { AbstractDimensionalSpaceConverter } from './dimensional-converter';
const rangeUtil = require('../range-util');

export abstract class AbstractSpaceConverter {
  abstract row: AbstractDimensionalSpaceConverter;
  abstract col: AbstractDimensionalSpaceConverter;
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

  iterate() {
    // expects to be called with the space as its this
    const args = rangeUtil.getArgs(arguments);
    const range = args.range;
    const rowFn = args.rowFn;
    const cellFn = args.cellFn;
    let rowResult;
    rowloop: for (let r = range.top; r < range.top + range.height; r = this.row.next(r)) {
      rowResult = undefined;
      if (rowFn) {
        rowResult = rowFn(r);
      }
      colloop: for (let c = range.left; c < range.left + range.width; c = this.col.next(c)) {
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