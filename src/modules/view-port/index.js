var util = require('@grid/util');
var rangeUtil = require('@grid/range-util');
var capitalize = require('capitalize');
var addDirtyProps = require('@grid/add-dirty-props');
var debounce = require('debounce');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);
    var container;

    var viewPort = addDirtyProps({}, ['rows', 'cols', 'width', 'height'], [dirtyClean]);
    viewPort.rows = 0;
    viewPort.cols = 0;
    viewPort.isDirty = dirtyClean.isDirty;

    //these probably trigger reflow so we may need to think about caching the value and updating it at on draws or something
    Object.defineProperty(viewPort, 'top', {
        enumerable: true,
        get: function () {
            return container && container.getClientRects()[0].top || 0;
        }
    });

    Object.defineProperty(viewPort, 'left', {
        enumerable: true,
        get: function () {
            return container && container.getClientRects()[0].left || 0;
        }
    });

    viewPort.toGridX = function (clientX) {
        return clientX - viewPort.left;
    };

    viewPort.toGridY = function (clientY) {
        return clientY - viewPort.top;
    };


    var fixed = {rows: 0, cols: 0};

    function getFixed(rowOrCol) {
        return fixed[rowOrCol + 's'];
    }

    viewPort.sizeToContainer = function (elem) {
        container = elem;
        viewPort.width = elem.offsetWidth;
        viewPort.height = elem.offsetHeight;
        viewPort.rows = calculateMaxLengths(viewPort.height, grid.rowModel);
        viewPort.cols = calculateMaxLengths(viewPort.width, grid.colModel);
        grid.eventLoop.fire('grid-viewport-change');
    };

    viewPort._onResize = debounce(function () {
        if (container) {
            viewPort.sizeToContainer(container);
        }
    }, 200);

    grid.eventLoop.bind('resize', window, function () {
        //we don't bind the handler directly so that tests can mock it out
        viewPort._onResize();
    });

    grid.eventLoop.bind('grid-row-change', function () {
        fixed.rows = grid.rowModel.numFixed();
    });

    grid.eventLoop.bind('grid-col-change', function () {
        fixed.cols = grid.colModel.numFixed();
    });

    function convertRealToVirtual(coord, rowOrCol, coordIsVirtual) {
        //could cache this on changes i.e. row-change or col-change events
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


//default unclamped cause that seems to be the more likely use case converting this direction
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

    function getTopOrLeft(viewPortCoord, rowOrCol, heightOrWidth) {
        var rowOrColCap = capitalize(rowOrCol);
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var clampFn = viewPort['clamp' + rowOrColCap];
        var pos = 0;
        var crossesFixed;
        var numFixed = getFixed(rowOrCol);
        if (numFixed) {
            crossesFixed = viewPortCoord >= numFixed;
            pos += lengthFn(0, (crossesFixed ? numFixed : viewPortCoord) - 1);
        }
        if (crossesFixed || !numFixed) {
            pos += lengthFn(toVirtual(numFixed), toVirtual(clampFn(viewPortCoord)) - 1);
        }
        return pos;
    }

    viewPort.getRowTop = function (viewPortCoord) {
        return getTopOrLeft(viewPortCoord, 'row', 'height');
    };

    viewPort.getColLeft = function (viewPortCol) {
        return getTopOrLeft(viewPortCol, 'col', 'width');
    };

    viewPort.toPx = function (realCellRange) {
        var virtualRow = viewPort.toVirtualRow(realCellRange.top);
        var virtualCol = viewPort.toVirtualCol(realCellRange.left);
        return {
            top: viewPort.getRowTop(realCellRange.top),
            left: viewPort.getColLeft(realCellRange.left),
            height: grid.virtualPixelCellModel.height(virtualRow, virtualRow + realCellRange.height - 1),
            width: grid.virtualPixelCellModel.width(virtualCol, virtualCol + realCellRange.width - 1)
        };
    };

    function getVirtualRowOrColFromPosition(pos, rowOrCol, heightOrWidth) {
        //we could do this slighly faster with binary search to get log(n) instead of n, but will only do it if we actually need to optimize this
        var rowOrColCap = capitalize(rowOrCol);
        var viewMax = viewPort[rowOrCol + 's'];
        var toVirtual = viewPort['toVirtual' + rowOrColCap];
        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
        var summedLength = 0;
        for (var i = 0; i < viewMax; i++) {
            var virtual = toVirtual(i);
            var length = lengthFn(virtual);
            var newSum = summedLength + length;
            if (newSum > pos) {
                return virtual;
            }
            summedLength = newSum;
        }
        return NaN;
    }

    viewPort.getVirtualRowByTop = function (top) {
        return getVirtualRowOrColFromPosition(top, 'row', 'height');
    };

    viewPort.getVirtualColByLeft = function (left) {
        return getVirtualRowOrColFromPosition(left, 'col', 'width');
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
        //assume virtual cells for now
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

        //it might be safer to actually sum the lengths in the virtualPixelCellModel but for now here is ok
        for (var index = numFixed; index < lengthModel.length(); index++) {
            windowLength += lengthMethod(index);
            while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
                windowLength -= lengthMethod(index);
                windowStartIndex++;
            }
            var windowSize = index - windowStartIndex + 1; // add the one because we want the last index that didn't fit
            if (windowSize > maxSize) {
                maxSize = windowSize;
            }

        }
        return maxSize === 0 ? 0 : maxSize + numFixed + 1;
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