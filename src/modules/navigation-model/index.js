var key = require('key');
var arrow = key.code.arrow;
var util = require('../util');
var rangeUtil = require('../range-util');

module.exports = function (_grid) {
    var grid = _grid;

    var model = {
        focus: {
            row: 0,
            col: 0
        }
    };

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    model.focusDecorator = grid.decorators.create(0, 0, 1, 1);
    model.focusDecorator.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-focus-decorator');
        return div;
    };
    grid.decorators.add(model.focusDecorator);


    function clampRowToMinMax(row) {
        return util.clamp(row, 0, grid.rowModel.length() - 1);
    }

    function clampColToMinMax(col) {
        return util.clamp(col, 0, grid.colModel.length() - 1);
    }

    model.setFocus = function setFocus(row, col, optionalEvent) {
        row = grid.data.row.clamp(row);
        col = grid.data.col.clamp(col);
        var changed = row !== model.focus.row || col !== model.focus.col;
        model.focus.row = row;
        model.focus.col = col;
        focusClass.top = row;
        focusClass.left = col;
        model.focusDecorator.top = row;
        model.focusDecorator.left = col;
        grid.cellScrollModel.scrollIntoView(row, col);
        //focus changes always clear the selection
        clearSelection();
        if (changed) {
            grid.eventLoop.fire('grid-focus-change');
        }
    };

    function navFrom(row, col, e) {
        //if nothing changes great we'll stay where we are
        var newRow = row;
        var newCol = col;
        switch (e.which) {
            case arrow.down.code:
                newRow = grid.data.row.next(newRow);
                break;
            case arrow.up.code:
                newRow = grid.data.row.prev(newRow);
                break;
            case arrow.right.code:
                newCol = grid.data.col.next(newCol);
                break;
            case arrow.left.code:
                newCol = grid.data.col.prev(newCol);
                break;
        }
        if (newRow === undefined) {
            newRow = row;
        }
        if (newCol === undefined) {
            newCol = col;
        }
        return {row: newRow, col: newCol};
    }


    grid.eventLoop.bind('keydown', function (e) {
        if (!key.is(arrow, e.which)) {
            return;
        }
        //focus logic

        if (!e.shiftKey) {
            var newFocus = navFrom(model.focus.row, model.focus.col, e);
            model.setFocus(newFocus.row, newFocus.col, e);
        } else {
            //selection logic
            var newSelection;
            //stand in for if it's cleared
            if (model.selection.top === -1) {
                newSelection = {top: model.focus.row, left: model.focus.col, height: 1, width: 1};
            } else {
                newSelection = {
                    top: model.selection.top,
                    left: model.selection.left,
                    height: model.selection.height,
                    width: model.selection.width
                };
            }
            var navFromRow;
            var navFromCol;
            if (model.focus.row === newSelection.top) {
                navFromRow = newSelection.top + newSelection.height - 1;
            } else {
                navFromRow = newSelection.top;
            }

            if (model.focus.col === newSelection.left) {
                navFromCol = newSelection.left + newSelection.width - 1;
            } else {
                navFromCol = newSelection.left;
            }
            var newRowCol = navFrom(navFromRow, navFromCol, e);
            model.setSelection(rangeUtil.createFromPoints(newRowCol.row, newRowCol.col, model.focus.row, model.focus.col));

        }
    });

    function outsideMinMax(row, col) {
        return row < 0 || row > grid.rowModel.length() || col < 0 || col > grid.colModel.length();
    }

    grid.eventLoop.bind('mousedown', function (e) {
        //assume the event has been annotated by the cell mouse model interceptor
        var row = e.row;
        var col = e.col;
        if (row < 0 && col >= 0) {
            grid.colModel.toggleSelect(col);
        }
        if (col < 0 && row >= 0) {
            grid.rowModel.toggleSelect(row);
        }

        if (row < 0 && col < 0) {
            return;
        }

        if (!e.shiftKey) {
            model.setFocus(row, col, e);
        } else {
            setSelectionFromPoints(model.focus.row, model.focus.col, row, col);
        }

    });

    model._rowSelectionClasses = [];
    model._colSelectionClasses = [];
    //row col selection
    function handleRowColSelectionChange(rowOrCol) {
        var decoratorsField = ('_' + rowOrCol + 'SelectionClasses');
        model[decoratorsField].forEach(function (selectionDecorator) {
            grid.cellClasses.remove(selectionDecorator);
        });
        model[decoratorsField] = [];

        grid[rowOrCol + 'Model'].getSelected().forEach(function (index) {
            var virtualIndex = grid[rowOrCol + 'Model'].toVirtual(index);
            var top = rowOrCol === 'row' ? virtualIndex : 0;
            var left = rowOrCol === 'col' ? virtualIndex : 0;
            var decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
            grid.cellClasses.add(decorator);
            model[decoratorsField].push(decorator);
        });
    }

    grid.eventLoop.bind('grid-row-selection-change', function () {
        handleRowColSelectionChange('row');
    });

    grid.eventLoop.bind('grid-col-selection-change', function () {
        handleRowColSelectionChange('col');
    });

    var selection = grid.decorators.create();

    var defaultRender = selection.render;
    selection.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-selection');
        return div;
    };

    grid.decorators.add(selection);

    model.setSelection = function setSelection(newSelection) {
        if (newSelection.height === 1 && newSelection.width === 1) {
            clearSelection();
            return;
        }
        selection.top = newSelection.top;
        selection.left = newSelection.left;
        selection.height = newSelection.height;
        selection.width = newSelection.width;
    };

    function clearSelection() {
        model.setSelection({top: -1, left: -1, height: -1, width: -1});
    }

    function setSelectionFromPoints(fromRow, fromCol, toRow, toCol) {
        var newSelection = rangeUtil.createFromPoints(fromRow, fromCol, clampRowToMinMax(toRow), clampColToMinMax(toCol));
        model.setSelection(newSelection);
    }

    selection._onDragStart = function (e) {
        if (outsideMinMax(e.row, e.col)) {
            return;
        }
        var fromRow = model.focus.row;
        var fromCol = model.focus.col;
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
            setSelectionFromPoints(fromRow, fromCol, e.row, e.col);
        });

        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };

    grid.eventLoop.bind('grid-drag-start', selection._onDragStart);
    clearSelection();

    model.selection = selection;

    return model;
};