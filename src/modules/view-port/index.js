module.exports = (function (_grid) {
    var grid = _grid;
    var viewPort = {};
    viewPort.sizeToContainer = function (elem) {
        viewPort.width = elem.offsetWidth;
        viewPort.height = elem.offsetHeight;
        viewPort.minRows = calculateMaxLengths(viewPort.height, grid.rowModel);
        viewPort.minCols = calculateMaxLengths(viewPort.width, grid.colModel);
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
            for (var c = 0; c < viewPort.minCols; c++) {
                if (cellFn) {
                    cellFn(r, c);
                }
            }
        }
    };

    return viewPort;
})