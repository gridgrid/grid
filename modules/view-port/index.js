"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debounce_1 = require("../debounce");
var dirty_clean_1 = require("../dirty-clean");
var dirty_props_1 = require("../dirty-props");
var rangeUtil = require("../range-util");
var util = require("../util");
function create(grid) {
    var dirtyClean = dirty_clean_1.default(grid);
    var container;
    function getFirstClientRect() {
        return container && container.getClientRects && container.getClientRects()[0];
    }
    function makeDimension(gridDimension) {
        function getVirtualRowColUnsafe(coord) {
            var numFixed = viewDimension._numFixed;
            if (coord < numFixed) {
                return coord;
            }
            return coord + gridDimension.cellScroll.position;
        }
        function getLengthBetweenViewCoords(startCoord, endCoord, inclusive) {
            var toVirtual = viewDimension.toVirtual;
            var lengthFn = gridDimension.virtualPixelCell.sizeOf;
            var clampFn = viewDimension.clampCell;
            var pos = 0;
            var numFixed = viewDimension._numFixed;
            var isInNonfixedArea = endCoord >= numFixed;
            var isInFixedArea = startCoord < numFixed;
            var exclusiveOffset = (inclusive ? 0 : 1);
            if (isInFixedArea) {
                var fixedEndCoord = (isInNonfixedArea ? numFixed - 1 : endCoord - exclusiveOffset);
                pos += lengthFn(startCoord, fixedEndCoord);
            }
            if (isInNonfixedArea) {
                var startOfNonFixed = isInFixedArea ? toVirtual(numFixed) : toVirtual(startCoord);
                pos += lengthFn(startOfNonFixed, toVirtual(clampFn(endCoord)) - exclusiveOffset);
            }
            return pos;
        }
        function getRowOrColFromPosition(pos, returnVirtual) {
            var viewMax = viewDimension.count;
            var toVirtual = viewDimension.toVirtual;
            var lengthFn = gridDimension.virtualPixelCell.sizeOf;
            var fixedSize = gridDimension.virtualPixelCell.fixedSize();
            var summedLength = grid.viewLayer.getBorderWidth() + (pos <= fixedSize ? 0 : gridDimension.pixelScroll.offset);
            for (var i = 0; i < viewMax; i++) {
                var virtual = toVirtual(i);
                var length_1 = lengthFn(virtual);
                var newSum = summedLength + length_1;
                if (newSum >= pos) {
                    return returnVirtual ? virtual : i;
                }
                summedLength = newSum;
            }
            return NaN;
        }
        function calculateMaxLengths(totalLength) {
            var lengthMethod = gridDimension.virtualPixelCell.sizeOf;
            var numFixed = gridDimension.rowColModel.numFixed();
            var windowLength = 0;
            var maxSize = 0;
            var fixedLength = 0;
            var windowStartIndex = numFixed;
            for (var fixed = 0; fixed < numFixed; fixed++) {
                fixedLength += lengthMethod(fixed);
            }
            var maxLength = 0;
            for (var index = numFixed; index < gridDimension.rowColModel.length(true); index++) {
                var lengthOfIindex = lengthMethod(index);
                if (lengthOfIindex > maxLength) {
                    maxLength = lengthOfIindex;
                }
            }
            totalLength += maxLength;
            for (var index = numFixed; index < gridDimension.rowColModel.length(true); index++) {
                var lengthOfIindex = lengthMethod(index);
                windowLength += lengthOfIindex;
                while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
                    windowLength -= lengthMethod(windowStartIndex);
                    windowStartIndex++;
                }
                var windowSize = index - windowStartIndex + 1;
                if (windowSize > maxSize) {
                    maxSize = windowSize;
                }
            }
            return Math.min(maxSize + numFixed + 1, gridDimension.rowColModel.length(true));
        }
        var viewDimension = dirty_props_1.default({
            count: 0,
            size: 0,
            clientPx: {
                get start() {
                    var clientRect = getFirstClientRect();
                    return clientRect && gridDimension.positionRange.getPosition(clientRect) || 0;
                },
                toGrid: function (clientPx) {
                    return clientPx - viewDimension.clientPx.start;
                }
            },
            _numFixed: 0,
            isInView: function (virtualCoord) {
                var realRow = viewDimension.toReal(virtualCoord);
                return !isNaN(realRow) &&
                    getLengthBetweenViewCoords(0, realRow, true) < viewDimension.totalSize();
            },
            toVirtual: function (viewCoord) {
                var virtualRowCol = getVirtualRowColUnsafe(viewCoord);
                return gridDimension.virtualPixelCell.clampCell(virtualRowCol);
            },
            toReal: function (virtualCoord) {
                var numFixed = viewDimension._numFixed;
                if (virtualCoord < numFixed) {
                    return virtualCoord;
                }
                var maxViewPortIndex = viewDimension.count - 1;
                return util.clamp(virtualCoord - gridDimension.cellScroll.position, numFixed, maxViewPortIndex, true);
            },
            clampCell: function (coord) {
                return util.clamp(coord, 0, viewDimension.count - 1);
            },
            clampPx: function (px) {
                return util.clamp(px, 0, viewDimension.totalSize());
            },
            toPx: function (coord) {
                return getLengthBetweenViewCoords(0, coord);
            },
            toVirtualFromPx: function (px) {
                return getRowOrColFromPosition(px, true);
            },
            toViewFromPx: function (px) {
                return getRowOrColFromPosition(px);
            },
            sizeOf: function (viewCoord) {
                return gridDimension.virtualPixelCell.sizeOf(viewDimension.toVirtual(viewDimension.clampCell(viewCoord)));
            },
            totalSize: function () {
                return viewDimension.size;
            },
            intersect: function (intersection, range) {
                var numFixed = viewDimension._numFixed;
                var fixedRange = [0, numFixed];
                var virtualRange = [gridDimension.positionRange.getPosition(range), gridDimension.positionRange.getSize(range)];
                var fixedIntersection = rangeUtil.intersect(fixedRange, virtualRange);
                var scrollRange = [numFixed, viewDimension.count - numFixed];
                virtualRange[0] -= gridDimension.cellScroll.position;
                var scrollIntersection = rangeUtil.intersect(scrollRange, virtualRange);
                var resultRange = rangeUtil.union(fixedIntersection, scrollIntersection);
                if (!resultRange) {
                    return null;
                }
                gridDimension.positionRange.setPosition(intersection, resultRange[0]);
                gridDimension.positionRange.setSize(intersection, resultRange[1]);
                return intersection;
            },
            updateSize: function (newSize) {
                var oldSize = viewDimension.size;
                viewDimension.size = newSize;
                viewDimension.count = calculateMaxLengths(newSize);
                return oldSize !== newSize;
            },
            _getLengthBetweenCoords: getLengthBetweenViewCoords
        }, ['count', 'size'], [dirtyClean]);
        return viewDimension;
    }
    var dimensions = {
        rowInfo: makeDimension(grid.rows),
        colInfo: makeDimension(grid.cols)
    };
    var viewPort = {
        _onResize: debounce_1.default(function () {
            viewPort._resize();
        }, 200),
        shortDebouncedResize: debounce_1.default(function () {
            viewPort._resize();
        }, 1),
        isDirty: dirtyClean.isDirty,
        sizeToContainer: function (elem) {
            container = elem;
            var isHeightChange = viewPort.rowInfo.updateSize(elem.offsetHeight);
            var isWidthChange = viewPort.colInfo.updateSize(elem.offsetWidth);
            var event = {
                type: 'grid-viewport-change',
                isWidthChange: isWidthChange,
                isHeightChange: isHeightChange,
                isSizeChange: isWidthChange || isHeightChange,
            };
            grid.eventLoop.fire(event);
        },
        _resize: function () {
            if (container) {
                viewPort.sizeToContainer(container);
            }
        },
        toPx: function (realCellRange) {
            return {
                top: viewPort.getRowTop(realCellRange.top),
                left: viewPort.getColLeft(realCellRange.left),
                height: viewPort.rowInfo._getLengthBetweenCoords(realCellRange.top, realCellRange.top + realCellRange.height - 1, true),
                width: viewPort.colInfo._getLengthBetweenCoords(realCellRange.left, realCellRange.left + realCellRange.width - 1, true)
            };
        },
        intersect: function (range) {
            var intersection = viewPort.rowInfo.intersect({}, range);
            if (!intersection) {
                return null;
            }
            return viewPort.colInfo.intersect(intersection, range);
        },
        iterateCells: function (cellFn, rowFn, maxRow, maxCol) {
            if (maxRow === void 0) { maxRow = Infinity; }
            if (maxCol === void 0) { maxCol = Infinity; }
            for (var r = 0; r < Math.min(viewPort.rows, maxRow); r++) {
                if (rowFn) {
                    rowFn(r);
                }
                if (cellFn) {
                    for (var c = 0; c < Math.min(viewPort.cols, maxCol); c++) {
                        cellFn(r, c);
                    }
                }
            }
        },
        get rows() {
            return dimensions.rowInfo.count;
        },
        set rows(r) {
            dimensions.rowInfo.count = r;
        },
        get cols() {
            return dimensions.colInfo.count;
        },
        set cols(c) {
            dimensions.colInfo.count = c;
        },
        get height() {
            return dimensions.rowInfo.size;
        },
        set height(s) {
            dimensions.rowInfo.size = s;
        },
        get width() {
            return dimensions.colInfo.size;
        },
        set width(s) {
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
        rowInfo: dimensions.rowInfo,
        colInfo: dimensions.colInfo,
    };
    grid.eventLoop.bind('grid-destroy', function () {
        viewPort._onResize.cancel();
        viewPort.shortDebouncedResize.cancel();
    });
    grid.eventLoop.bind(window, 'resize', function () {
        viewPort._onResize();
    });
    grid.eventLoop.bind('grid-row-change', function () {
        viewPort.rowInfo._numFixed = grid.rowModel.numFixed();
        viewPort.shortDebouncedResize();
    });
    grid.eventLoop.bind('grid-col-change', function () {
        viewPort.colInfo._numFixed = grid.colModel.numFixed();
        viewPort.shortDebouncedResize();
    });
    return viewPort;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map