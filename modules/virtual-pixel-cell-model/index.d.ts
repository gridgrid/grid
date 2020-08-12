import { Grid } from '../core';
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
export declare function create(grid: Grid): IVirtualPixelCellModel;
export default create;
