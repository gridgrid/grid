
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class DataSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new DimensionalDataSpaceConverter(this.grid.rows);
  col: AbstractDimensionalSpaceConverter = new DimensionalDataSpaceConverter(this.grid.cols);
}

class DimensionalDataSpaceConverter extends AbstractDimensionalSpaceConverter {
  toData(i: number) {
    return i;
  }
  toVirtual(dataCol: number) {
    return this.gridDimension.rowColModel.toVirtual(dataCol);
  }
  count() {
    return this.gridDimension.rowColModel.length();
  }
  toView(dataCol: number) {
    return this.gridDimension.converters.virtual.toView(this.toVirtual(dataCol));
  }
}