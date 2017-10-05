import { Grid, IGridDimension } from '../core';
import * as  util from '../util';

// all pixels are assumed to be in the virtual world, no real world pixels are dealt with here :)
export interface IVirtualPixelCellDimensionInfo {
    toCellFromPx(px: number): number;
    clampCell(cell: number): number;
    sizeOf(startCell: number, endCell?: number): number;
    totalSize(): number;
    fixedSize(): number;
}

export interface IVirtualPixelCellModel {
    rows: IVirtualPixelCellDimensionInfo;
    cols: IVirtualPixelCellDimensionInfo;
    getRow: IVirtualPixelCellDimensionInfo['toCellFromPx'];
    getCol: IVirtualPixelCellDimensionInfo['toCellFromPx'];
    clampRow: IVirtualPixelCellDimensionInfo['clampCell'];
    clampCol: IVirtualPixelCellDimensionInfo['clampCell'];
    height: IVirtualPixelCellDimensionInfo['sizeOf'];
    width: IVirtualPixelCellDimensionInfo['sizeOf'];
    totalWidth: IVirtualPixelCellDimensionInfo['totalSize'];
    totalHeight: IVirtualPixelCellDimensionInfo['totalSize'];
    fixedWidth: IVirtualPixelCellDimensionInfo['fixedSize'];
    fixedHeight: IVirtualPixelCellDimensionInfo['fixedSize'];
}

function makeDimension(gridDimension: IGridDimension) {
    const dimension: IVirtualPixelCellDimensionInfo = {
        toCellFromPx(px: number) {
            if (px < 0) {
                return NaN;
            }
            let sumLength = 0;
            for (let r = 0; r < gridDimension.rowColModel.length(true); r++) {
                sumLength += gridDimension.rowColModel.sizeOf(r);
                if (px < sumLength) {
                    return r;
                }
            }
            return NaN;
        },
        clampCell(cell: number) {
            const maxRowCol = gridDimension.rowColModel.length(true) - 1;
            return util.clamp(cell, 0, maxRowCol);
        },
        sizeOf(start: number, end?: number) {
            let length = 0;
            if (end != undefined && end < start) {
                return 0;
            }
            end = util.isNumber(end) ? end : start;
            end = dimension.clampCell(end);
            start = dimension.clampCell(start);
            for (let i = start; i <= end; i++) {
                length += gridDimension.rowColModel.sizeOf(i);
            }
            return length;
        },
        totalSize() {
            return dimension.sizeOf(0, gridDimension.rowColModel.length(true) - 1);
        },
        fixedSize() {
            return dimension.sizeOf(0, gridDimension.rowColModel.numFixed() - 1);
        },
    };
    return dimension;
}

export function create(grid: Grid) {

    const dimensions = {
        rows: makeDimension(grid.rows),
        cols: makeDimension(grid.cols),
    };
    const virtualPixelCellModel: IVirtualPixelCellModel = {
        getRow: dimensions.rows.toCellFromPx,
        getCol: dimensions.cols.toCellFromPx,
        clampRow: dimensions.rows.clampCell,
        clampCol: dimensions.cols.clampCell,
        height: dimensions.rows.sizeOf,
        width: dimensions.cols.sizeOf,
        totalHeight: dimensions.rows.totalSize,
        totalWidth: dimensions.cols.totalSize,
        fixedHeight: dimensions.rows.fixedSize,
        fixedWidth: dimensions.cols.fixedSize,
        rows: dimensions.rows,
        cols: dimensions.cols,
    };

    function sizeChangeListener() {
        // for now we don't cache anything about this so we just notify
        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
    }

    grid.eventLoop.bind('grid-col-change', sizeChangeListener);
    grid.eventLoop.bind('grid-row-change', sizeChangeListener);

    return virtualPixelCellModel;
}

export default create;