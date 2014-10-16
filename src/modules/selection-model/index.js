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

    function setSelection(newSelection) {
        model.top = newSelection.top;
        model.left = newSelection.left;
        model.height = newSelection.height;
        model.width = newSelection.width;
    }

    function clearSelection() {
        setSelection({top: -1, left: -1, height: -1, width: -1});
    }

    model._onDragStart = function (e) {
        var startRow = e.row;
        var startCol = e.col;
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
            dragThisClick = true;
            var newSelection = rangeUtil.createFromPoints(startRow, startCol, e.row, e.col);
            setSelection(newSelection);
        });

        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };

    model._onClick = function (e) {
        if (!e.wasDragged) {
            clearSelection();
        }
    };

    grid.eventLoop.bind('grid-drag-start', model._onDragStart);
    grid.eventLoop.bind('click', model._onClick);

    return model;
};