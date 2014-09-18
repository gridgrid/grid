module.exports = function (numRows, numCols) {

    var grid = {};
    grid.rowModel = require('@grid/row-model')(grid);
    grid.colModel = require('@grid/col-model')(grid);
    grid.dataModel = require('@grid/simple-data-model')(grid);
    grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);
    grid.viewLayer = require('@grid/view-layer')(grid);

    if (numRows) {
        for (var r = 0; r < numRows; r++) {
            grid.rowModel.add({});
            if (numCols) {
                for (var c = 0; c < numCols || 0; c++) {
                    if (r === 0) {
                        grid.colModel.add({});
                    }
                    grid.dataModel.set(r, c, {value: r + '-' + c});
                }
            }
        }
    }


    return grid;
};