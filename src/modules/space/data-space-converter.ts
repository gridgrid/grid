
import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class DataSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter<IRowDescriptor> = new DimensionalDataSpaceConverter(this.grid.rows);
  col: AbstractDimensionalSpaceConverter<IColDescriptor> = new DimensionalDataSpaceConverter(this.grid.cols);
}

class DimensionalDataSpaceConverter<T extends IRowDescriptor | IColDescriptor> extends AbstractDimensionalSpaceConverter<T> {
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