
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class VirtualSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new DimensionalVirtualSpaceConverter(this.grid.rows);
  col: AbstractDimensionalSpaceConverter = new DimensionalVirtualSpaceConverter(this.grid.cols);
}

class DimensionalVirtualSpaceConverter extends AbstractDimensionalSpaceConverter {
  toVirtual(i: number) {
    return i;
  }
  toData(virtualCol: number) {
    return this.gridDimension.rowColModel.toData(virtualCol);
  }
  count() {
    return this.gridDimension.rowColModel.length(true);
  }

  toView(virtualRow: number) {
    return this.gridDimension.viewPort.toReal(virtualRow);
  }
}
