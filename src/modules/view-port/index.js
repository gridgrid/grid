var util = require('../util');
var rangeUtil = require('../range-util');
var capitalize = require('capitalize');
var addDirtyProps = require('../add-dirty-props');
var debounce = require('../debounce');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('../dirty-clean')(grid);
    var container;

    var viewPort = addDirtyProps({}, ['rows', 'cols', 'width', 'height'], [dirtyClean]);
    viewPort.rows = 0;
    viewPort.cols = 0;
    viewPort.isDirty = dirtyClean.isDirty;

    // these probably trigger reflow so we may need to think about caching the value and updating it at on draws or something
    function getFirstClientRect() {
        return container && container.getClientRects && container.getClientRects() && container.getClientRects()[0] || {};
    }

    Object.defineProperty(viewPort, 'top', {
        enumerable: true,
        get: function () {
            return getFirstClientRect().top || 0;
        }
    });

    Object.defineProperty(viewPort, 'left', {
        enumerable: true,
        get: function () {
            return getFirstClientRect().left || 0;
        }
    });

    viewPort.toGridX = function (clientX) {
        return clientX - viewPort.left;
    };

    viewPort.toGridY = function (clientY) {
        return clientY - viewPort.top;
    };


    var fixed = {
        rows: 0,
        cols: 0
    };

    function getFixed(rowOrCol) {
        return fixed[rowOrCol + 's'];
    }

    viewPort.sizeToContainer = function (elem) {
        container = elem;
        var oldWidth = viewPort.width;
        var oldHeight = viewPort.height;
        viewPort.width = elem.offsetWidth;
        viewPort.height = elem.offsetHeight;
        viewPort.rows = calculateMaxLengths(viewPort.height, grid.rowModel);
        viewPort.cols = calculateMaxLengths(viewPort.width, grid.colModel);
        var event = {};
        event.type = 'grid-viewport-change';
        event.isWidthChange = oldWidth !== viewPort.width;
        event.isHeightChange = oldHeight !== viewPort.height;
        event.isSizeChange = event.isWidthChange || event.isHeightChange;
        grid.eventLoop.fire(event);
    };

    viewPort._onResize = debounce(function () {
        viewPort._resize();
    }, 200);

    grid.eventLoop.bind('grid-destroy', function () {
        clearTimeout(viewPort._onResize.timeout);
        clearTimeout(shortDebouncedResize.timeout);
    });

    viewPort._resize = function () {
        if (container) {
            viewPort.sizeToContainer(container);
        }
    };

    var shortDebouncedResize = debounce(function () {
        viewPort._resize();
    }, 1);

    viewPort.shortDebouncedResize = shortDebouncedResize;


    grid.eventLoop.bind('resize', window, function () {
        //we don't bind the handler directly so that tests can mock it out
        viewPort._onResize();
    });

    grid.eventLoop.bind('grid-row-change', function () {
        fixed.rows = grid.rowModel.numFixed();
        shortDebouncedResize();
    });

    grid.eventLoop.bind('grid-col-change', function () {
        fixed.cols = grid.colModel.numFixed();
        shortDebouncedResize();
    });

    function convertRealToVirtual(coord, rowOrCol, coordIsVirtual) {
        // could cache this on changes i.e. row-change or col-change events
        var numFixed = getFixed(rowOrCol);
        if (coord < numFixed) {
            return coord;
        }
        return coord + (coordIsVirtual ? -1 : 1) * grid.cellScrollModel[rowOrCol];
    }

    // converts a viewport row or column to a real row or column
    // clamps it if the column would be outside the range
    function getVirtualRowColUnsafe(realCoord, rowOrCol) {
        return convertRealToVirtual(realCoord, rowOrCol);
    }

    function getVirtualRowColClamped(viewCoord, rowOrCol) {
        var virtualRowCol = getVirtualRowColUnsafe(viewCoord, rowOrCol);
        return grid.virtualPixelCellModel['clamp' + capitalize(rowOrCol)](virtualRowCol);
    }

    viewPort.toVirtualRow = function (r) {
        return getVirtualRowColClamped(r, 'row');
    };

    viewPort.toVirtualCol = function (c) {
        return getVirtualRowColClamped(c, 'col');
    };

    function getRealRowColClamped(virtualCoord, rowOrCol) {
        var numFixed = getFixed(rowOrCol);
        if (virtualCoord < numFixed) {
            return virtualCoord;
        }
        var maxViewPortIndex = viewPort[rowOrCol + 's'] - 1;
        return util.clamp(virtualCoord - grid.cellScrollModel[rowOrCol], numFixed, maxViewPortIndex, true);
    }

    viewPort.rowIsInView = function (virtualRow) {
        var realRow = viewPort.toRealRow(virtualRow);
        return !isNaN(realRow) && getLengthBetweenViewCoords(0, realRow, 'row', 'height', true) < viewPort.height;
    };

    viewPort.colIsInView = function (virtualCol) {
        var realCol = viewPort.toRealCol(virtualCol);
        return !isNaN(realCol) && getLengthBetweenViewCoords(0, realCol, 'col', 'width', true) < viewPort.width;
    };


    // default unclamped cause that seems to be the more likely use case converting this direction
    viewPort.toRealRow = function (virtualRow) {
        return getRealRowColClamped(virtualRow, 'row');
    };

    viewPort.toRealCol = function (virtualCol) {
        return getRealRowColClamped(virtualCol, 'col');
    };

    viewPort.clampRow = function (r) {
        return util.clamp(r, 0, viewPort.rows - 1);
    };

    viewPort.clampCol = function (c) {
        return util.clamp(c, 0, viewPort.cols - 1);
    };

    viewPort.clampY = function (y) {
        return util.clamp(y, 0, viewPort.height);
    };

    viewPort.clampX = function (x) {
        return util.clamp(x, 0, viewPort.width);
    };

    function getLengthBetweenViewCoords(startCoord, endCoord, rowOrCol, heightOrWidth, inclusive) {
        var rowOrColCap = capitalize(rowOrCol);
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var clampFn = viewPort['clamp' + rowOrColCap];
        var pos = 0;
        var numFixed = getFixed(rowOrCol);
        var isInNonfixedArea = endCoord >= numFixed;
        var isInFixedArea = startCoord < numFixed;
        var exclusiveOffset = (inclusive ? 0 : 1);
        if (isInFixedArea) {
            var fixedEndCoord = (isInNonfixedArea ? numFixed - 1 : endCoord - exclusiveOffset);
            pos += lengthFn(startCoord, fixedEndCoord);
        }
        if (isInNonfixedArea) {
            pos += lengthFn((isInFixedArea ? toVirtual(numFixed) : toVirtual(startCoord)), toVirtual(clampFn(endCoord)) - exclusiveOffset);
        }
        return pos;
    }

    function getTopOrLeft(endCoord, rowOrCol, heightOrWidth) {
        return getLengthBetweenViewCoords(0, endCoord, rowOrCol, heightOrWidth);
    }

    viewPort.getRowTop = function (viewPortCoord) {
        return getTopOrLeft(viewPortCoord, 'row', 'height');
    };

    viewPort.getColLeft = function (viewPortCol) {
        return getTopOrLeft(viewPortCol, 'col', 'width');
    };

    viewPort.toPx = function (realCellRange) {
        return {
            top: viewPort.getRowTop(realCellRange.top),
            left: viewPort.getColLeft(realCellRange.left),
            height: getLengthBetweenViewCoords(realCellRange.top, realCellRange.top + realCellRange.height - 1, 'row', 'height', true),
            width: getLengthBetweenViewCoords(realCellRange.left, realCellRange.left + realCellRange.width - 1, 'col', 'width', true)
        };
    };

    function getRowOrColFromPosition(pos, rowOrCol, heightOrWidth, topOrLeft, returnVirtual) {
        // we could do this slighly faster with binary search to get log(n) instead of n, but will only do it if we actually need to optimize this
        var rowOrColCap = capitalize(rowOrCol);
        var viewMax = viewPort[rowOrCol + 's'];
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var fixed = grid.virtualPixelCellModel['fixed' + capitalize(heightOrWidth)]();
        var summedLength = grid.viewLayer.getBorderWidth() + (pos <= fixed ? 0 : grid.pixelScrollModel['offset' + capitalize(topOrLeft)]);
        for (var i = 0; i < viewMax; i++) {
            var virtual = toVirtual(i);
            var length = lengthFn(virtual);
            var newSum = summedLength + length;
            if (newSum >= pos) {
                return returnVirtual ? virtual : i;
            }
            summedLength = newSum;
        }
        return NaN;
    }

    viewPort.getVirtualRowByTop = function (top) {
        return getRowOrColFromPosition(top, 'row', 'height', 'top', true);
    };

    viewPort.getVirtualColByLeft = function (left) {
        return getRowOrColFromPosition(left, 'col', 'width', 'left', true);
    };

    viewPort.getRowByTop = function (top) {
        return getRowOrColFromPosition(top, 'row', 'height', 'top');
    };

    viewPort.getColByLeft = function (left) {
        return getRowOrColFromPosition(left, 'col', 'width', 'left');
    };

    viewPort.getRowHeight = function (viewPortRow) {
        return grid.virtualPixelCellModel.height(viewPort.toVirtualRow(viewPort.clampRow(viewPortRow)));
    };

    viewPort.getColWidth = function (viewPortCol) {
        return grid.virtualPixelCellModel.width(viewPort.toVirtualCol(viewPort.clampCol(viewPortCol)));
    };

    function intersectRowsOrCols(intersection, range, topOrLeft, rowOrCol, heightOrWidth) {
        var numFixed = fixed[rowOrCol + 's'];
        var fixedRange = [0, numFixed];

        var virtualRange = [range[topOrLeft], range[heightOrWidth]];
        var fixedIntersection = rangeUtil.intersect(fixedRange, virtualRange);
        var scrollRange = [numFixed, viewPort[rowOrCol + 's'] - numFixed];
        virtualRange[0] -= grid.cellScrollModel[rowOrCol];
        var scrollIntersection = rangeUtil.intersect(scrollRange, virtualRange);
        var resultRange = rangeUtil.union(fixedIntersection, scrollIntersection);
        if (!resultRange) {
            return null;
        }

        intersection[topOrLeft] = resultRange[0];
        intersection[heightOrWidth] = resultRange[1];
        return intersection;
    }

    viewPort.intersect = function (range) {
        // assume virtual cells for now
        var intersection = intersectRowsOrCols({}, range, 'top', 'row', 'height');
        if (!intersection) {
            return null;
        }
        return intersectRowsOrCols(intersection, range, 'left', 'col', 'width');
    };


    function calculateMaxLengths(totalLength, lengthModel) {
        var lengthMethod = lengthModel.width && grid.virtualPixelCellModel.width || grid.virtualPixelCellModel.height;
        var numFixed = lengthModel.numFixed();
        var windowLength = 0;
        var maxSize = 0;
        var fixedLength = 0;
        var windowStartIndex = numFixed;

        for (var fixed = 0; fixed < numFixed; fixed++) {
            fixedLength += lengthMethod(fixed);
        }

        var maxLength = 0;
        for (var index = numFixed; index < lengthModel.length(true); index++) {
            var lengthOfIindex = lengthMethod(index);
            if (lengthOfIindex > maxLength) {
                maxLength = lengthOfIindex;
            }
        }
        totalLength += maxLength;

        // it might be safer to actually sum the lengths in the virtualPixelCellModel but for now here is ok
        for (var index = numFixed; index < lengthModel.length(true); index++) {
            var lengthOfIindex = lengthMethod(index);
            windowLength += lengthOfIindex;
            while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
                windowLength -= lengthMethod(windowStartIndex);
                windowStartIndex++;
            }
            var windowSize = index - windowStartIndex + 1; // add the one because we want the last index that didn't fit
            if (windowSize > maxSize) {
                maxSize = windowSize;
            }

        }
        return Math.min(maxSize + numFixed + 1, grid.virtual[lengthModel.width ? 'col' : 'row'].count());
    }


    viewPort.iterateCells = function (cellFn, optionalRowFn, optionalMaxRow, optionalMaxCol) {
        optionalMaxRow = optionalMaxRow || Infinity;
        optionalMaxCol = optionalMaxCol || Infinity;
        for (var r = 0; r < Math.min(viewPort.rows, optionalMaxRow); r++) {
            if (optionalRowFn) {
                optionalRowFn(r);
            }
            if (cellFn) {
                for (var c = 0; c < Math.min(viewPort.cols, optionalMaxCol); c++) {
                    cellFn(r, c);

                }
            }
        }
    };

    return viewPort;
}
