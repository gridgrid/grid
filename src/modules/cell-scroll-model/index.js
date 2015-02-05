var util = require('../util');

module.exports = function(_grid) {
    var grid = _grid;
    var dirtyClean = require('../dirty-clean')(grid);


    var row;
    var model = {
        col: 0
    };
    Object.defineProperty(model, 'row', {
        enumerable: true,
        get: function() {
            return row;
        },
        set: function(r) {
            row = r;
        }
    });
    model.row = 0;

    model.isDirty = dirtyClean.isDirty;

    grid.eventLoop.bind('grid-row-change', function(e) {
        switch (e.action) {
            case 'remove':
                model.scrollTo(0, 0);
                break;
        }
    });

    model.scrollTo = function(r, c, dontFire, fromPixelModel) {
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
                grid.eventLoop.fire('grid-cell-scroll');
            }

            if (!fromPixelModel) {
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

    //for now assumes data space
    model.scrollIntoView = function(dataRow, dataCol) {
        dataRow = grid.data.row.clamp(grid.data.row.toVirtual(dataRow));
        dataCol = grid.data.col.clamp(grid.data.col.toVirtual(dataCol));
        var newRow = getScrollToRowOrCol(dataRow, 'row', 'height');
        var newCol = getScrollToRowOrCol(dataCol, 'col', 'width');
        model.scrollTo(newRow, newCol);
    };


    return model;
};