
import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class VirtualSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter<IRowDescriptor> = new DimensionalVirtualSpaceConverter(this.grid.rows);
  col: AbstractDimensionalSpaceConverter<IColDescriptor> = new DimensionalVirtualSpaceConverter(this.grid.cols);
}

class DimensionalVirtualSpaceConverter<T extends IRowDescriptor | IColDescriptor> extends AbstractDimensionalSpaceConverter<T> {
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
