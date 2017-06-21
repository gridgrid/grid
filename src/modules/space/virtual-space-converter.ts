
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class VirtualSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new VirtualRowSpaceConverter(this.grid);
  col: AbstractDimensionalSpaceConverter = new VirtualColSpaceConverter(this.grid);
}

abstract class AbstractVirtualSpaceConverter extends AbstractDimensionalSpaceConverter {
  toVirtual(i: number) {
    return i;
  }
  toData(virtualCol: number) {
    return this.rowColModel.toData(virtualCol);
  }
  count() {
    return this.rowColModel.length(true);
  }
}

class VirtualColSpaceConverter extends AbstractVirtualSpaceConverter {
  get rowColModel() {
    return this.grid.colModel;
  }
  toView(virtualCol: number) {
    return this.grid.viewPort.toRealCol(virtualCol);
  }
}

class VirtualRowSpaceConverter extends AbstractVirtualSpaceConverter {
  get rowColModel() {
    return this.grid.rowModel;
  }
  toView(virtualRow: number) {
    return this.grid.viewPort.toRealRow(virtualRow);
  }
}
