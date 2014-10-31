var key = require('key');
var util = require('@grid/util');
var rangeUtil = require('@grid/range-util');

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

    model.focusDecorator = grid.decorators.create();
    model.focusDecorator.height = 1;
    model.focusDecorator.width = 1;
    model.focusDecorator.render = function () {
        var div = defaultRender();
        div.setAttribute('class', 'grid-focus-decorator');
        return div;
    };
    grid.decorators.add(model.focusDecorator);

    function defineLimitProp(prop, defaultValue) {
        var val = defaultValue;
        Object.defineProperty(model, prop, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                var isChanged = _val !== val;
                val = _val;

                if (isChanged) {
                    model.setFocus(model.focus.row, model.focus.col);
                }
            }
        });
    }

    defineLimitProp('minRow', 0);
    defineLimitProp('minCol', 0);
    defineLimitProp('maxRow', Infinity);
    defineLimitProp('maxCol', Infinity);


    function clampRowToMinMax(row) {
        row = util.clamp(row, Math.max(model.minRow, 0), Math.min(model.maxRow, grid.rowModel.length() - 1));
        return row;
    }

    function clampColToMinMax(col) {
        return util.clamp(col, Math.max(model.minCol, 0), Math.min(model.maxCol, grid.colModel.length() - 1));
    }

    model.setFocus = function setFocus(row, col, optionalEvent) {
        row = clampRowToMinMax(row);
        col = clampColToMinMax(col);
        model.focus.row = row;
        model.focus.col = col;
        focusClass.top = row;
        focusClass.left = col;
        model.focusDecorator.top = row;
        model.focusDecorator.left = col;
        grid.cellScrollModel.scrollIntoView(row, col);
        //focus changes always clear the selection
        clearSelection();
    };

    grid.eventLoop.bind('keydown', function (e) {
        var arrow = key.code.arrow;
        if (!key.is(arrow, e.which)) {
            return;
        }
        //focus logic

        if (!e.shiftKey) {
            //if nothing changes great we'll stay where we are
            var navToRow = model.focus.row;
            var navToCol = model.focus.col;


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
            model.setFocus(navToRow, navToCol, e);
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

            switch (e.which) {
                case arrow.down.code:
                    if (model.focus.row === newSelection.top) {
                        newSelection.height++;
                    } else {
                        newSelection.top++;
                        newSelection.height--;
                    }
                    break;
                case arrow.up.code:
                    if (model.focus.row === newSelection.top + newSelection.height - 1) {
                        newSelection.top--;
                        newSelection.height++;
                    } else {
                        newSelection.height--;

                    }
                    break;
                case arrow.right.code:
                    if (model.focus.col === newSelection.left) {
                        newSelection.width++;
                    } else {
                        newSelection.left++;
                        newSelection.width--;
                    }
                    break;
                case arrow.left.code:
                    if (model.focus.col === newSelection.left + newSelection.width - 1) {
                        newSelection.left--;
                        newSelection.width++;
                    } else {
                        newSelection.width--;
                    }
                    break;
            }
            if (newSelection.height === 1 && newSelection.width === 1) {
                clearSelection();
            } else {
                model.setSelection(newSelection);
            }

        }
    });

    function outsideMinMax(row, col) {
        return row < model.minRow || row > model.maxRow || col < model.minCol || col > model.maxCol;
    }

    grid.eventLoop.bind('mousedown', function (e) {
        //assume the event has been annotated by the cell mouse model interceptor
        var row = e.row;
        var col = e.col;
        if (e.row < 0) {
            grid.colModel.select(e.col);
        }
        if (e.col < 0) {
            grid.rowModel.select(e.row);
        }
        
        if (outsideMinMax(row, col)) {
            return;
        }
        if (!e.shiftKey) {
            model.setFocus(row, col, e);
        } else {
            setSelectionFromPoints(model.focus.row, model.focus.col, row, col);
        }
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