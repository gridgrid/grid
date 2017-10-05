import { AbstractRowColModel, IRowDescriptor } from '../abstract-row-col-model';
import { Grid } from '../core';

export class RowModel extends AbstractRowColModel {
    height = (idx: number) => {
        return this.sizeOf(idx);
    }
    row = (idx: number): IRowDescriptor => {
        return this.get(idx, true);
    }
}

export function create(grid: Grid) {
    return new RowModel(grid, 'row', 'height', 30);
}

export default create;