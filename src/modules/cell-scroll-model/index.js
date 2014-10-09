var util = require('@grid/util');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);


    var model = {row: 0, col: 0};

    model.isDirty = dirtyClean.isDirty;

    grid.eventLoop.bind('grid-pixel-scroll', function () {
        var scrollTop = grid.pixelScrollModel.top;
        var row = grid.virtualPixelCellModel.getRow(scrollTop);

        var scrollLeft = grid.pixelScrollModel.left;
        var col = grid.virtualPixelCellModel.getCol(scrollLeft);

        model.scrollTo(row, col);
    });

    model.scrollTo = function (r, c) {
        var maxRow = grid.rowModel.length() - 1;
        var maxCol = grid.colModel.length() - 1;
        var lastRow = model.row;
        var lastCol = model.col;
        model.row = util.clamp(r, 0, maxRow);
        model.col = util.clamp(c, 0, maxCol);
        if (lastRow !== model.row || lastCol !== model.col) {
            dirtyClean.setDirty();
        }
    };

    function convertVirtualToScroll(virtualCoord, rowOrCol) {
        return virtualCoord - grid[rowOrCol + 'Model'].numFixed();
    }

    function getScrollToRowOrCol(virtualCoord, rowOrCol) {
        var currentScroll = model[rowOrCol];
        var scrollTo = currentScroll;
        var targetScroll = convertVirtualToScroll(virtualCoord, rowOrCol);
        var viewPortLength = grid.viewLayer.viewPort[rowOrCol + 's'];
        if (targetScroll < currentScroll) {
            scrollTo = targetScroll;
        } else if (targetScroll > currentScroll + viewPortLength) {
            scrollTo = targetScroll - viewPortLength;
        }

        return scrollTo;
    }

    model.scrollIntoView = function (vr, vc) {
        vr = grid.virtualPixelCellModel.clampRow(vr);
        vc = grid.virtualPixelCellModel.clampCol(vc);
        var newRow = getScrollToRowOrCol(vr, 'row');
        var newCol = getScrollToRowOrCol(vc, 'col');
        model.scrollTo(newRow, newCol);
    };


    return model;
};