module.exports = function (_grid) {
    var grid = _grid;

    var DEFAULT_WIDTH = 100;
    var cols = [];
    var numFixed = 0;

    var api = {
        add: function (col) {
            cols.push(col);
            grid.eventLoop.fire('grid-col-change');
        },
        get: function (index) {
            return cols[index];
        },
        length: function () {
            return cols.length;
        },
        width: function (index) {
            return cols[index].width || DEFAULT_WIDTH;
        },
        numFixed: function () {
            return numFixed;
        }
    };

    return api;
};