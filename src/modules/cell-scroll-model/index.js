module.exports = (function (_grid) {
    var grid = _grid;
    var model = {row: 0, col: 0};

    model.scrollTo = function (r, c) {
        var maxRow = grid.rowModel.length() - 1;
        var maxCol = grid.colModel.length() - 1;
        if (r > maxRow) {
            r = maxRow;
        }
        if (c > maxCol) {
            c = maxCol;
        }
        model.row = r;
        model.col = c;
    };
    return model;
})