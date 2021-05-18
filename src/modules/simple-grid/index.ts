import { IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { ColModel } from '../col-model';
import createGrid, { Grid, IGridOpts } from '../core';
import { RowModel } from '../row-model';
import createSimpleDataModel, { ISimpleDataModel } from '../simple-data-model';

export interface ISimpleGrid extends Grid {
    dataModel: ISimpleDataModel;
    rowModel: ISimpleRowModel;
    colModel: ISimpleColModel;
}

export interface ISimpleGridRow extends IRowDescriptor {
    dataRow: number;
    dataLayer?: number;
}
export interface ISimpleGridCol extends IColDescriptor {
    dataCol: number;
}

export interface ISimpleRowModel extends RowModel {
    row: (idx: number) => ISimpleGridRow;
    get(idx: number): ISimpleGridRow;
    create(): ISimpleGridRow;
}

export interface ISimpleColModel extends ColModel {
    col: (idx: number) => ISimpleGridCol;
    get(idx: number): ISimpleGridCol;
    create(): ISimpleGridCol;
}

export function create(
    numRows: number,
    numCols: number,
    varyHeights?: number[],
    varyWidths?: number[],
    fixedRows?: number,
    fixedCols?: number,
    preSetupFn?: (grid: Grid) => void,
    headerRows?: number,
    headerCols?: number,
    opts?: IGridOpts
) {

    const grid = createGrid(opts) as ISimpleGrid;
    grid.dataModel = createSimpleDataModel(grid);

    if (preSetupFn) {
        preSetupFn(grid);
    }

    headerRows = headerRows || 0;
    headerCols = headerCols || 0;

    if (numRows) {
        const rows = [];
        const cols = [];
        for (let r = 0; r < numRows + headerRows; r++) {
            const row = grid.rowModel.create() as ISimpleGridRow;
            const dataRow = r - headerRows;
            row.dataRow = dataRow;
            if (r < headerRows) {
                row.dataRow = r;
                row.header = true;
            } else if (fixedRows != undefined && r < fixedRows + headerRows) {
                row.fixed = true;
            }
            if (Array.isArray(varyHeights)) {
                row.height = varyHeights[r % varyHeights.length];
            }
            rows.push(row);
            if (numCols) {
                for (let c = 0; c < numCols + headerCols || 0; c++) {
                    const dataCol = c - headerCols;
                    if (r === 0) {
                        const col = grid.colModel.create() as ISimpleGridCol;
                        col.dataCol = dataCol;
                        if (c < headerCols) {
                            col.dataCol = c;
                            col.header = true;
                        } else if (fixedCols != undefined && c < fixedCols + headerCols) {
                            col.fixed = true;
                        }
                        if (varyWidths) {
                            col.width = Array.isArray(varyWidths) ?
                                varyWidths[c % varyWidths.length] :
                                Math.random() * 10 + 101;

                        }
                        cols.push(col);
                    }
                    if (c < headerCols || r < headerRows) {
                        grid.dataModel.setHeader(r, c, [r + '', c + '']);
                    } else {
                        grid.dataModel.set(dataRow, dataCol, [dataRow, dataCol]);
                    }
                }
            }
        }
        grid.rowModel.add(rows);
        grid.colModel.add(cols);
    }

    return grid;
}

export default create;