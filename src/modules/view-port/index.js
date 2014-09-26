var util = require('@grid/util');
var capitalize = require('capitalize');

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
    function getVirtualRowColUnsafe(viewCoord, rowOrCol) {
        return viewCoord + grid.cellScrollModel[rowOrCol];
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

    viewPort.clampRow = function (r) {
        return util.clamp(r, 0, viewPort.minRows - 1);
    };

    viewPort.clampCol = function (c) {
        return util.clamp(c, 0, viewPort.minCols - 1);
    };


    viewPort.getRowTop = function (viewPortRow) {
        return grid.virtualPixelCellModel.height(viewPort.toVirtualRow(0), viewPort.toVirtualRow(viewPort.clampRow(viewPortRow)) - 1);
    };

    viewPort.getColLeft = function (viewPortCol) {
        return grid.virtualPixelCellModel.width(viewPort.toVirtualCol(0), viewPort.toVirtualCol(viewPort.clampCol(viewPortCol)) - 1);
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