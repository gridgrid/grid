
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class DataSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new DataRowSpaceConverter(this.grid);
  col: AbstractDimensionalSpaceConverter = new DataColSpaceConverter(this.grid);
}

abstract class AbstractDataSpaceConverter extends AbstractDimensionalSpaceConverter {
  toData(i: number) {
    return i;
  }
  toVirtual(dataCol: number) {
    return this.rowColModel.toVirtual(dataCol);
  }
  count() {
    return this.rowColModel.length();
  }
}

class DataColSpaceConverter extends AbstractDataSpaceConverter {
  get rowColModel() {
    return this.grid.colModel;
  }
  toView(dataCol: number) {
    return this.grid.virtual.col.toView(this.toVirtual(dataCol));
  }
}

class DataRowSpaceConverter extends AbstractDataSpaceConverter {
  get rowColModel() {
    return this.grid.rowModel;
  }
  toView(dataRow: number) {
    return this.grid.virtual.row.toView(this.toVirtual(dataRow));
  }
}
