var key = require('key');
var util = require('@grid/util');

module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        row: 0,
        col: 0,
        minRow: 0,
        minCol: 0,
        maxRow: Infinity,
        maxCol: Infinity
    };


    api.navTo = function navTo(row, col) {
        row = util.clamp(row, Math.max(api.minRow, 0), Math.min(api.maxRow, grid.rowModel.length() - 1));
        col = util.clamp(col, Math.max(api.minCol, 0), Math.min(api.maxCol, grid.colModel.length() - 1));
        api.row = row;
        api.col = col;
        focusClass.top = row;
        focusClass.left = col;
    };

    grid.eventLoop.bind('keydown', function (e) {
        //if nothing changes great we'll stay where we are
        var navToRow = api.row;
        var navToCol = api.col;

        var arrow = key.code.arrow;
        switch (e.which) {
            case arrow.down.code:
                navToRow++;
                break;
            case arrow.up.code:
                navToRow--;
                break;
            case arrow.right.code:
                navToCol++;
                break;
            case arrow.left.code:
                navToCol--;
                break;
        }
        api.navTo(navToRow, navToCol);
    });

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    return api;
};