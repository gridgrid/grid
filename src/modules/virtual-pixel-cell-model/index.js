var util = require('../util');

module.exports = function (_grid) {
    var grid = _grid;
    var model = {};

    //all pixels are assumed to be in the virtual world, no real world pixels are dealt with here :)
    model.getRow = function (topPx) {
        if (topPx < 0) {
            return NaN;
        }
        var sumLength = 0;
        for (var r = 0; r < grid.rowModel.length(true); r++) {
            sumLength += grid.rowModel.height(r);
            if (topPx < sumLength) {
                return r;
            }
        }
        return NaN;
    };

    //yes these are very similar but there will be differences
    model.getCol = function (leftPx) {
        if (leftPx < 0) {
            return NaN;
        }
        var sumLength = 0;
        for (var c = 0; c < grid.colModel.length(true); c++) {
            sumLength += grid.colModel.width(c);
            if (leftPx < sumLength) {
                return c;
            }
        }
        return NaN;
    };


    function clampRowOrCol(virtualRowCol, rowOrCol) {
        var maxRowCol = grid[rowOrCol + 'Model'].length(true) - 1;
        return util.clamp(virtualRowCol, 0, maxRowCol);
    }

    model.clampRow = function (virtualRow) {
        return clampRowOrCol(virtualRow, 'row');
    };

    model.clampCol = function (virtualCol) {
        return clampRowOrCol(virtualCol, 'col');
    };

    //for now these just call through to the row and column model, but very likely it will need to include some other calculations
    model.height = function (virtualRowStart, virtualRowEnd) {
        return heightOrWidth(virtualRowStart, virtualRowEnd, 'row');
    };

    model.width = function (virtualColStart, virtualColEnd) {
        return heightOrWidth(virtualColStart, virtualColEnd, 'col');
    };

    function heightOrWidth(start, end, rowOrCol) {
        var length = 0;
        if (end < start) {
            return 0;
        }
        end = util.isNumber(end) ? end : start;
        end = clampRowOrCol(end, rowOrCol);
        start = clampRowOrCol(start, rowOrCol);
        var lengthModel = grid[rowOrCol + 'Model'];
        var lengthFn = lengthModel.width || lengthModel.height;
        for (var i = start; i <= end; i++) {
            length += lengthFn(i);
        }
        return length;
    }

    model.totalHeight = function () {
        return model.height(0, grid.rowModel.length(true) - 1);
    };

    model.totalWidth = function () {
        return model.width(0, grid.colModel.length(true) - 1);
    };

    model.fixedHeight = function () {
        return model.height(0, grid.rowModel.numFixed() - 1);
    };

    model.fixedWidth = function () {
        return model.width(0, grid.colModel.numFixed() - 1);
    };

    function sizeChangeListener() {
        //for now we don't cache anything about this so we just notify
        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
    }

    grid.eventLoop.bind('grid-col-change', sizeChangeListener);
    grid.eventLoop.bind('grid-row-change', sizeChangeListener);

    return model;
};