
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class ViewSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new DimensionalViewSpaceConverter(this.grid.rows);
  col: AbstractDimensionalSpaceConverter = new DimensionalViewSpaceConverter(this.grid.cols);
}

class DimensionalViewSpaceConverter extends AbstractDimensionalSpaceConverter {
  toView(i: number) {
    return i;
  }
  toData(viewCol: number) {
    return this.gridDimension.converters.virtual.toData(this.toVirtual(viewCol));
  }
  toVirtual(viewCol: number) {
    return this.gridDimension.viewPort.toVirtual(viewCol);
  }
  count() {
    return this.gridDimension.viewPort.count;
  }
}
