var key = require('key');

module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        row: 0,
        col: 0
    };


    api.navTo = function navTo(row, col) {
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
            case arrow.down:
                navToRow++;
                break;
            case arrow.up:
                navToRow--;
                break;
            case arrow.right:
                navToCol++;
                break;
            case arrow.left:
                navToCol--;
                break;
        }
        api.navTo(navToRow, navToCol);
    });

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    return api;
};