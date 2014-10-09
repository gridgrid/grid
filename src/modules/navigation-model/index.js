var key = require('key');
var util = require('@grid/util');

module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        row: 0,
        col: 0
    };

    function defineLimitProp(prop, defaultValue) {
        var val = defaultValue;
        Object.defineProperty(api, prop, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                var isChanged = _val !== val;
                val = _val;

                if (isChanged) {
                    api.navTo(api.row, api.col);
                }
            }
        });
    }

    defineLimitProp('minRow', 0);
    defineLimitProp('minCol', 0);
    defineLimitProp('maxRow', Infinity);
    defineLimitProp('maxCol', Infinity);


    api.navTo = function navTo(row, col) {
        row = util.clamp(row, Math.max(api.minRow, 0), Math.min(api.maxRow, grid.rowModel.length() - 1));
        col = util.clamp(col, Math.max(api.minCol, 0), Math.min(api.maxCol, grid.colModel.length() - 1));
        api.row = row;
        api.col = col;
        focusClass.top = row;
        focusClass.left = col;
        grid.cellScrollModel.scrollIntoView(row, col);
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

    grid.eventLoop.bind('mousedown', function (e) {
        //assume the event has been annotated by the cell mouse model interceptor
        api.navTo(e.gridRow, e.gridCol);
    });

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    return api;
};