import { Grid, IGridDimension } from '../core';
import debounce, { IDebounceFunction } from '../debounce';
import makeDirtyClean from '../dirty-clean';
import addDirtyProps from '../dirty-props';
import {
    RawPositionRange,
} from '../position-range';
import * as rangeUtil from '../range-util';
import * as util from '../util';

export interface IViewPort {
    rowInfo: IViewPortDimensionInfo;
    colInfo: IViewPortDimensionInfo;
    _onResize: IDebounceFunction;
    shortDebouncedResize: IDebounceFunction;

    // BEGIN: methods / properties proxied to a dimension impl
    rows: IViewPortDimensionInfo['count'];
    cols: IViewPortDimensionInfo['count'];
    top: IViewPortDimensionInfo['clientPx']['start'];
    left: IViewPortDimensionInfo['clientPx']['start'];
    width: IViewPortDimensionInfo['size'];
    height: IViewPortDimensionInfo['size'];
    toGridX: IViewPortDimensionInfo['clientPx']['toGrid'];
    toGridY: IViewPortDimensionInfo['clientPx']['toGrid'];
    toVirtualRow: IViewPortDimensionInfo['toVirtual'];
    toVirtualCol: IViewPortDimensionInfo['toVirtual'];
    rowIsInView: IViewPortDimensionInfo['isInView'];
    colIsInView: IViewPortDimensionInfo['isInView'];
    toRealRow: IViewPortDimensionInfo['toReal'];
    toRealCol: IViewPortDimensionInfo['toReal'];
    clampRow: IViewPortDimensionInfo['clampCell'];
    clampCol: IViewPortDimensionInfo['clampCell'];
    clampY: IViewPortDimensionInfo['clampPx'];
    clampX: IViewPortDimensionInfo['clampPx'];
    getRowTop: IViewPortDimensionInfo['toPx'];
    getColLeft: IViewPortDimensionInfo['toPx'];
    getVirtualRowByTop: IViewPortDimensionInfo['toVirtualFromPx'];
    getVirtualColByLeft: IViewPortDimensionInfo['toVirtualFromPx'];
    getRowByTop: IViewPortDimensionInfo['toViewFromPx'];
    getColByLeft: IViewPortDimensionInfo['toViewFromPx'];
    getRowHeight: IViewPortDimensionInfo['sizeOf'];
    getColWidth: IViewPortDimensionInfo['sizeOf'];
    // END: methods / properties proxied to a dimension impl

    isDirty(): boolean;
    sizeToContainer(elem: HTMLElement): void;
    _resize(): void;
    toPx(realCellRange: RawPositionRange): RawPositionRange;
    intersect(range: RawPositionRange): RawPositionRange | null;
    iterateCells(
        cellFn: (r: number, c: number) => void,
        rowFn?: (r: number) => void,
        optionalMaxRow?: number,
        optionalMaxCol?: number
    ): void;
}

export interface IViewPortDimensionInfo {
    count: number;
    size: number;
    clientPx: {
        start: number;
        toGrid(clientPx: number): number;
    };
    _numFixed: number;
    _getLengthBetweenCoords(s: number, e: number, inclusive?: boolean): number;
    isInView(virtualCoord: number): boolean;
    toVirtual(viewCoord: number): number;
    toReal(virtualCoord: number): number;
    clampCell(coord: number): number;
    clampPx(px: number): number;
    toPx(coord: number): number;
    toVirtualFromPx(px: number): number;
    toViewFromPx(px: number): number;
    sizeOf(viewCoord: number): number;
    totalSize(): number;
    updateSize(newSize: number): boolean;
    intersect(intersection: RawPositionRange, range: RawPositionRange): RawPositionRange | null;
}

export function create(grid: Grid) {
    const dirtyClean = makeDirtyClean(grid);
    let container: HTMLElement | undefined;

    // these probably trigger reflow so we may need to think about caching the value and updating it at on draws or something
    function getFirstClientRect() {
        return container && container.getClientRects && container.getClientRects()[0];
    }

    function makeDimension(
        gridDimension: IGridDimension
    ) {
        function getVirtualRowColUnsafe(coord: number) {
            // could cache this on changes i.e. row-change or col-change events
            const numFixed = viewDimension._numFixed;
            if (coord < numFixed) {
                return coord;
            }
            return coord + gridDimension.cellScroll.position;
        }

        function getLengthBetweenViewCoords(
            startCoord: number,
            endCoord: number,
            inclusive?: boolean
        ) {
            const toVirtual = viewDimension.toVirtual;
            const lengthFn = gridDimension.virtualPixelCell.sizeOf;
            const clampFn = viewDimension.clampCell;
            let pos = 0;
            const numFixed = viewDimension._numFixed;
            const isInNonfixedArea = endCoord >= numFixed;
            const isInFixedArea = startCoord < numFixed;
            const exclusiveOffset = (inclusive ? 0 : 1);
            if (isInFixedArea) {
                const fixedEndCoord = (isInNonfixedArea ? numFixed - 1 : endCoord - exclusiveOffset);
                pos += lengthFn(startCoord, fixedEndCoord);
            }
            if (isInNonfixedArea) {
                const startOfNonFixed = isInFixedArea ? toVirtual(numFixed) : toVirtual(startCoord);
                pos += lengthFn(startOfNonFixed, toVirtual(clampFn(endCoord)) - exclusiveOffset);
            }
            return pos;
        }

        function getRowOrColFromPosition(pos: number, returnVirtual?: boolean) {
            // we could do this slighly faster with binary search to get log(n) instead of n,
            // but will only do it if we actually need to optimize this
            const viewMax = viewDimension.count;
            const toVirtual = viewDimension.toVirtual;
            const lengthFn = gridDimension.virtualPixelCell.sizeOf;
            const fixedSize = gridDimension.virtualPixelCell.fixedSize();
            let summedLength = grid.viewLayer.getBorderWidth() + (pos <= fixedSize ? 0 : gridDimension.pixelScroll.offset);
            for (let i = 0; i < viewMax; i++) {
                const virtual = toVirtual(i);
                const length = lengthFn(virtual);
                const newSum = summedLength + length;
                if (newSum >= pos) {
                    return returnVirtual ? virtual : i;
                }
                summedLength = newSum;
            }
            return NaN;
        }

        function calculateMaxLengths(totalLength: number) {
            const lengthMethod = gridDimension.virtualPixelCell.sizeOf;
            const numFixed = gridDimension.rowColModel.numFixed();
            let windowLength = 0;
            let maxSize = 0;
            let fixedLength = 0;
            let windowStartIndex = numFixed;

            for (let fixed = 0; fixed < numFixed; fixed++) {
                fixedLength += lengthMethod(fixed);
            }

            let maxLength = 0;
            for (let index = numFixed; index < gridDimension.rowColModel.length(true); index++) {
                const lengthOfIindex = lengthMethod(index);
                if (lengthOfIindex > maxLength) {
                    maxLength = lengthOfIindex;
                }
            }
            totalLength += maxLength;

            // it might be safer to actually sum the lengths in the virtualPixelCellModel but for now here is ok
            for (let index = numFixed; index < gridDimension.rowColModel.length(true); index++) {
                const lengthOfIindex = lengthMethod(index);
                windowLength += lengthOfIindex;
                while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
                    windowLength -= lengthMethod(windowStartIndex);
                    windowStartIndex++;
                }
                const windowSize = index - windowStartIndex + 1; // add the one because we want the last index that didn't fit
                if (windowSize > maxSize) {
                    maxSize = windowSize;
                }

            }
            return Math.min(maxSize + numFixed + 1, gridDimension.rowColModel.length(true));
        }

        const viewDimension: IViewPortDimensionInfo = addDirtyProps({
            count: 0,
            size: 0,
            clientPx: {
                get start() {
                    const clientRect = getFirstClientRect();
                    return clientRect && gridDimension.positionRange.getPosition(clientRect) || 0;
                },
                toGrid(clientPx: number) {
                    return clientPx - viewDimension.clientPx.start;
                }
            },
            _numFixed: 0,
            isInView(virtualCoord: number) {
                const realRow = viewDimension.toReal(virtualCoord);
                return !isNaN(realRow) &&
                    getLengthBetweenViewCoords(0, realRow, true) < viewDimension.totalSize();
            },
            toVirtual(viewCoord: number) {
                const virtualRowCol = getVirtualRowColUnsafe(viewCoord);
                return gridDimension.virtualPixelCell.clampCell(virtualRowCol);
            },
            toReal(virtualCoord: number) {
                const numFixed = viewDimension._numFixed;
                if (virtualCoord < numFixed) {
                    return virtualCoord;
                }
                const maxViewPortIndex = viewDimension.count - 1;
                return util.clamp(virtualCoord - gridDimension.cellScroll.position, numFixed, maxViewPortIndex, true);
            },
            clampCell(coord: number) {
                return util.clamp(coord, 0, viewDimension.count - 1);
            },
            clampPx(px: number) {
                return util.clamp(px, 0, viewDimension.totalSize());
            },
            toPx(coord: number) {
                return getLengthBetweenViewCoords(0, coord);
            },
            toVirtualFromPx(px: number) {
                return getRowOrColFromPosition(px, true);
            },
            toViewFromPx(px: number) {
                return getRowOrColFromPosition(px);
            },
            sizeOf(viewCoord: number) {
                return gridDimension.virtualPixelCell.sizeOf(viewDimension.toVirtual(viewDimension.clampCell(viewCoord)));
            },
            totalSize() {
                return viewDimension.size;
            },
            // TODO: based on looking at the code i think range can sometimes be Partial, def worth checking for npes
            intersect(intersection: RawPositionRange, range: RawPositionRange) {
                const numFixed = viewDimension._numFixed;
                const fixedRange = [0, numFixed];

                const virtualRange = [gridDimension.positionRange.getPosition(range), gridDimension.positionRange.getSize(range)];
                const fixedIntersection = rangeUtil.intersect(fixedRange, virtualRange);
                const scrollRange = [numFixed, viewDimension.count - numFixed];
                virtualRange[0] -= gridDimension.cellScroll.position;
                const scrollIntersection = rangeUtil.intersect(scrollRange, virtualRange);
                const resultRange = rangeUtil.union(fixedIntersection, scrollIntersection);
                if (!resultRange) {
                    return null;
                }

                gridDimension.positionRange.setPosition(intersection, resultRange[0]);
                gridDimension.positionRange.setSize(intersection, resultRange[1]);
                return intersection;
            },
            updateSize(newSize: number) {
                const oldSize = viewDimension.size;
                viewDimension.size = newSize;
                viewDimension.count = calculateMaxLengths(newSize);
                return oldSize !== newSize;
            },
            _getLengthBetweenCoords: getLengthBetweenViewCoords
        }, ['count', 'size'], [dirtyClean]);
        return viewDimension;
    }

    const dimensions = {
        rowInfo: makeDimension(grid.rows),
        colInfo: makeDimension(grid.cols)
    };

    const viewPort: IViewPort = {
        _onResize: debounce(() => {
            viewPort._resize();
        }, 200),
        shortDebouncedResize: debounce(() => {
            viewPort._resize();
        }, 1),
        isDirty: dirtyClean.isDirty,

        sizeToContainer(elem: HTMLElement) {
            container = elem;
            const isHeightChange = viewPort.rowInfo.updateSize(elem.offsetHeight);
            const isWidthChange = viewPort.colInfo.updateSize(elem.offsetWidth);
            const event = {
                type: 'grid-viewport-change',
                isWidthChange,
                isHeightChange,
                isSizeChange: isWidthChange || isHeightChange,
            };
            grid.eventLoop.fire(event);
        },
        _resize() {
            if (container) {
                viewPort.sizeToContainer(container);
            }
        },
        toPx(realCellRange: RawPositionRange) {
            return {
                top: viewPort.getRowTop(realCellRange.top),
                left: viewPort.getColLeft(realCellRange.left),
                height: viewPort.rowInfo._getLengthBetweenCoords(realCellRange.top, realCellRange.top + realCellRange.height - 1, true),
                width: viewPort.colInfo._getLengthBetweenCoords(realCellRange.left, realCellRange.left + realCellRange.width - 1, true)
            };
        },
        intersect(range: RawPositionRange) {
            // assume virtual cells for now
            const intersection = viewPort.rowInfo.intersect({} as any, range);
            if (!intersection) {
                return null;
            }
            return viewPort.colInfo.intersect(intersection, range);
        },
        iterateCells(
            cellFn: (r: number, c: number) => void,
            rowFn?: (r: number) => void,
            maxRow: number = Infinity,
            maxCol: number = Infinity
        ) {
            for (let r = 0; r < Math.min(viewPort.rows, maxRow); r++) {
                if (rowFn) {
                    rowFn(r);
                }
                if (cellFn) {
                    for (let c = 0; c < Math.min(viewPort.cols, maxCol); c++) {
                        cellFn(r, c);

                    }
                }
            }
        },
        // BEGIN: proxy to dimension
        get rows() {
            return dimensions.rowInfo.count;
        },
        set rows(r: number) {
            dimensions.rowInfo.count = r;
        },
        get cols() {
            return dimensions.colInfo.count;
        },
        set cols(c: number) {
            dimensions.colInfo.count = c;
        },
        get height() {
            return dimensions.rowInfo.size;
        },
        set height(s: number) {
            dimensions.rowInfo.size = s;
        },
        get width() {
            return dimensions.colInfo.size;
        },
        set width(s: number) {
            dimensions.colInfo.size = s;
        },
        get top() {
            return dimensions.rowInfo.clientPx.start;
        },
        get left() {
            return dimensions.colInfo.clientPx.start;
        },
        toGridY: dimensions.rowInfo.clientPx.toGrid,
        toGridX: dimensions.colInfo.clientPx.toGrid,
        toVirtualRow: dimensions.rowInfo.toVirtual,
        toVirtualCol: dimensions.colInfo.toVirtual,
        rowIsInView: dimensions.rowInfo.isInView,
        colIsInView: dimensions.colInfo.isInView,
        toRealRow: dimensions.rowInfo.toReal,
        toRealCol: dimensions.colInfo.toReal,
        clampRow: dimensions.rowInfo.clampCell,
        clampCol: dimensions.colInfo.clampCell,
        clampY: dimensions.rowInfo.clampPx,
        clampX: dimensions.colInfo.clampPx,
        getRowTop: dimensions.rowInfo.toPx,
        getColLeft: dimensions.colInfo.toPx,
        getVirtualRowByTop: dimensions.rowInfo.toVirtualFromPx,
        getVirtualColByLeft: dimensions.colInfo.toVirtualFromPx,
        getRowByTop: dimensions.rowInfo.toViewFromPx,
        getColByLeft: dimensions.colInfo.toViewFromPx,
        getRowHeight: dimensions.rowInfo.sizeOf,
        getColWidth: dimensions.colInfo.sizeOf,
        // END: proxy to dimension
        rowInfo: dimensions.rowInfo,
        colInfo: dimensions.colInfo,
    };

    grid.eventLoop.bind('grid-destroy', () => {
        viewPort._onResize.cancel();
        viewPort.shortDebouncedResize.cancel();
    });

    grid.eventLoop.bind(window, 'resize', () => {
        // we don't bind the handler directly so that tests can mock it out
        viewPort._onResize();
    });

    grid.eventLoop.bind('grid-row-change', () => {
        viewPort.rowInfo._numFixed = grid.rowModel.numFixed();
        viewPort.shortDebouncedResize();
    });

    grid.eventLoop.bind('grid-col-change', () => {
        viewPort.colInfo._numFixed = grid.colModel.numFixed();
        viewPort.shortDebouncedResize();
    });

    return viewPort;
}

export default create;