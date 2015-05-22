module.exports = function(_grid) {
    var grid = _grid;
    grid.eventLoop.bind('click', function(e) {
        if (e.row === 0) {
            if (grid.dataModel.toggleSort) {
                grid.dataModel.toggleSort(e.col);
            }
        }
    });
};