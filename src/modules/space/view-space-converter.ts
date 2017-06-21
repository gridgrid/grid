
import { AbstractSpaceConverter } from './converter';
import { AbstractDimensionalSpaceConverter } from './dimensional-converter';

export class ViewSpaceConverter extends AbstractSpaceConverter {
  row: AbstractDimensionalSpaceConverter = new ViewRowSpaceConverter(this.grid);
  col: AbstractDimensionalSpaceConverter = new ViewColSpaceConverter(this.grid);
}

abstract class AbstractViewSpaceConverter extends AbstractDimensionalSpaceConverter {
  toView(i: number) {
    return i;
  }
}

class ViewColSpaceConverter extends AbstractViewSpaceConverter {
  get rowColModel() {
    return this.grid.colModel;
  }
  toData(viewCol: number) {
    return this.grid.virtual.col.toData(this.toVirtual(viewCol));
  }
  toVirtual(viewCol: number) {
    return this.grid.viewPort.toVirtualCol(viewCol);
  }
  count() {
    return this.grid.viewPort.cols;
  }
}

class ViewRowSpaceConverter extends AbstractViewSpaceConverter {
  get rowColModel() {
    return this.grid.rowModel;
  }
  toData(viewRow: number) {
    return this.grid.virtual.row.toData(this.toVirtual(viewRow));
  }
  toVirtual(viewRow: number) {
    return this.grid.viewPort.toVirtualRow(viewRow);
  }
  count() {
    return this.grid.viewPort.rows;
  }
}
