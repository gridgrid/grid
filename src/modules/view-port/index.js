var util = require('@grid/util');

module.exports = (function (_grid) {
    var grid = _grid;
    var viewPort = {};
    viewPort.sizeToContainer = function (elem) {
        viewPort.width = elem.offsetWidth;
        viewPort.height = elem.offsetHeight;
        viewPort.minRows = calculateMaxLengths(viewPort.height, grid.rowModel);
        viewPort.minCols = calculateMaxLengths(viewPort.width, grid.colModel);
    };


    // converts a viewport row or column to a real row or column 
    // clamps it if the column would be outside the range
    function getRealRowColUnsafe(viewCoord, rowOrCol) {
        return viewCoord + grid.cellScrollModel[rowOrCol];
    }

    function getRealRowColClamped(viewCoord, rowOrCol) {
        var realRowCol = getRealRowColUnsafe(viewCoord, rowOrCol);
        var maxRowCol = grid[rowOrCol + 'Model'].length();
        return util.clamp(realRowCol, 0, maxRowCol);
    }

    viewPort.toRealRow = function (r) {
        return getRealRowColClamped(r, 'row');
    };

    viewPort.toRealCol = function (c) {
        return getRealRowColClamped(c, 'col');
    };

    viewPort.clampRow = function (r) {
        return util.clamp(r, 0, viewPort.minRows);
    };

    viewPort.clampCol = function (c) {
        return util.clamp(c, 0, viewPort.minCols);
    };

    viewPort.getRowTop = function (row) {
        var length = 0;
        for (var r = 0; r < viewPort.clampRow(row); r++) {
            var realRow = viewPort.toRealRow(r);
            length += grid.rowModel.height(realRow);
        }
        return length;
    };

    viewPort.getColLeft = function (col) {
        var length = 0;
        for (var c = 0; c < viewPort.clampCol(col); c++) {
            var realCol = viewPort.toRealCol(c);
            length += grid.colModel.width(realCol);
        }
        return length;
    };


    function calculateMaxLengths(totalLength, lengthModel) {
        var lengthMethod = lengthModel.width || lengthModel.height;
        var numFixed = lengthModel.numFixed();
        var windowLength = 0;
        var maxSize = 0;
        var fixedLength = 0;
        var windowStartIndex = numFixed;

        for (var fixed = 0; fixed < numFixed; fixed++) {
            fixedLength += lengthMethod(fixed);
        }

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


    viewPort.iterateCells = function (cellFn, optionalRowFn) {
        for (var r = 0; r < viewPort.minRows; r++) {
            if (optionalRowFn) {
                optionalRowFn(r);
            }
            if (cellFn) {
                for (var c = 0; c < viewPort.minCols; c++) {
                    cellFn(r, c);

                }
            }
        }
    };

    return viewPort;
})