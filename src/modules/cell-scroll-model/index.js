var util = require('@grid/util');
var capitalize = require('capitalize');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);


    var row;
    var model = {col: 0};
    Object.defineProperty(model, 'row', {
        enumerable: true,
        get: function () {
            return row;
        },
        set: function (r) {
            if (r < 0 || isNaN(r)) {
                debugger;
            }
            row = r;
        }
    });
    model.row = 0;

    model.isDirty = dirtyClean.isDirty;

    model.scrollTo = function (r, c, dontFire) {
        if (isNaN(r) || isNaN(c)) {
            return;
        }
        var maxRow = (grid.rowModel.length() || 1) - 1;
        var maxCol = (grid.colModel.length() || 1) - 1;
        var lastRow = model.row;
        var lastCol = model.col;
        model.row = util.clamp(r, 0, maxRow);
        model.col = util.clamp(c, 0, maxCol);
        if (lastRow !== model.row || lastCol !== model.col) {
            dirtyClean.setDirty();
            if (!dontFire) {
                var top = grid.virtualPixelCellModel.height(0, model.row - 1);
                var left = grid.virtualPixelCellModel.width(0, model.col - 1);
                grid.pixelScrollModel.scrollTo(top, left, true);
            }
        }
    };

    function convertVirtualToScroll(virtualCoord, rowOrCol) {
        return virtualCoord - grid[rowOrCol + 'Model'].numFixed();
    }

    function getScrollToRowOrCol(virtualCoord, rowOrCol, heightWidth) {
        var currentScroll = model[rowOrCol];
        var scrollTo = currentScroll;
        if (grid.viewPort[rowOrCol + 'IsInView'](virtualCoord)) {
            return scrollTo;
        }

        var targetScroll = convertVirtualToScroll(virtualCoord, rowOrCol);
        if (targetScroll < currentScroll) {
            scrollTo = targetScroll;
        } else if (targetScroll > currentScroll) {

            var lengthToCell = grid.virtualPixelCellModel[heightWidth](0, virtualCoord);
            var numFixed = grid[rowOrCol + 'Model'].numFixed();
            scrollTo = 0;
            for (var i = numFixed; i < virtualCoord; i++) {
                lengthToCell -= grid.virtualPixelCellModel[heightWidth](i);
                scrollTo = i - (numFixed - 1);
                if (lengthToCell <= grid.viewPort[heightWidth]) {
                    break;
                }
            }
        }

        return scrollTo;
    }

    model.scrollIntoView = function (vr, vc) {
        vr = grid.virtualPixelCellModel.clampRow(vr);
        vc = grid.virtualPixelCellModel.clampCol(vc);
        var newRow = getScrollToRowOrCol(vr, 'row', 'height');
        var newCol = getScrollToRowOrCol(vc, 'col', 'width');
        model.scrollTo(newRow, newCol);
    };


    return model;
};