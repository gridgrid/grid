var util = require('@grid/util');

module.exports = (function (_grid) {
    var grid = _grid;
    var model = {};

    //all pixels are assumed to be in the virtual world, no real world pixels are dealt with here :)
    model.getRow = function (topPx) {
        if (topPx < 0) {
            return NaN;
        }
        var sumLength = 0;
        for (var r = 0; r < grid.rowModel.length(); r++) {
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
        for (var c = 0; c < grid.colModel.length(); c++) {
            sumLength += grid.colModel.width(c);
            if (leftPx < sumLength) {
                return c;
            }
        }
        return NaN;
    };

    //for now these just call through to the row and column model, but very likely it will need to include some other calculations
    model.height = function (virtualRowStart, virtualRowEnd) {
        var height = 0;
        virtualRowEnd = util.isNumber(virtualRowEnd) ? virtualRowEnd : virtualRowStart;
        for (var r = virtualRowStart; r <= virtualRowEnd; r++) {
            height += grid.rowModel.height(r);
        }
        return height;
    };

    model.width = function (virtualColStart, virtualColEnd) {
        var width = 0;
        virtualColEnd = util.isNumber(virtualColEnd) ? virtualColEnd : virtualColStart;
        for (var c = virtualColStart; c <= virtualColEnd; c++) {
            width += grid.colModel.width(c);
        }
        return width;
    };

    return model;
})