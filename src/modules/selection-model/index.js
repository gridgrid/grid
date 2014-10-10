var rangeUtil = require('@grid/range-util');

module.exports = function (_grid) {
    var grid = _grid;

    var model = grid.decorators.create();

    var defaultRender = model.render;
    model.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-selection');
        return div;
    };

    grid.decorators.add(model);

    model._onDragStart = function (e) {
        var startRow = e.row;
        var startCol = e.col;
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
            var newSelection = rangeUtil.createFromPoints(startRow, startCol, e.row, e.col);
            model.top = newSelection.top;
            model.left = newSelection.left;
            model.height = newSelection.height;
            model.width = newSelection.width;
        });

        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };

    grid.eventLoop.bind('grid-drag-start', model._onDragStart);

    return model;
};