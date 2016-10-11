var key = require('key');
var arrow = key.code.arrow;
var util = require('../util');
var rangeUtil = require('../range-util');
var ctrlOrCmd = require('../ctrl-or-cmd');

module.exports = function (_grid) {
    var grid = _grid;

    var model = {
        focus: {
            row: 0,
            col: 0
        },
        checkboxModeFor: {}
    };

    model.otherSelections = [];

    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);

    model.focusDecorator = grid.decorators.create(0, 0, 1, 1);
    var focusDefaultRender = model.focusDecorator.render;
    model.focusDecorator.render = function () {
        var div = focusDefaultRender();
        div.setAttribute('class', 'grid-focus-decorator');
        return div;
    };
    grid.decorators.add(model.focusDecorator);

    model.setFocus = function setFocus(row, col, dontClearSelection, dontSetSelection) {
        row = grid.data.row.clamp(row);
        if (typeof row !== 'number' || isNaN(row)) {
            row = model.focus.row;
        }
        col = grid.data.col.clamp(col);
        if (typeof col !== 'number' || isNaN(col)) {
            col = model.focus.col;
        }
        var changed = row !== model.focus.row || col !== model.focus.col;
        model.focus.row = row;
        model.focus.col = col;
        focusClass.top = row;
        focusClass.left = col;
        model.focusDecorator.top = row;
        model.focusDecorator.left = col;
        grid.cellScrollModel.scrollIntoView(row, col);
        if (!dontClearSelection) {
            clearOtherSelections();
        }
        if (!dontSetSelection) {
            setSelectionToFocus();
        }
        if (changed) {
            grid.eventLoop.fire('grid-focus-change');
        }
    };

    function seekNextEdge(newIndex, startedDefined, isForwardEdge, isBackwardEdge, goForward) {

        var isEdgeToSeek;
        if (isForwardEdge(newIndex) || !startedDefined) {
            isEdgeToSeek = isBackwardEdge;
        } else {
            isEdgeToSeek = isForwardEdge;
        }


        while (goForward(newIndex) !== undefined && !isEdgeToSeek(newIndex = goForward(newIndex))) /*eslint-disable no-empty*/ {
            // empty
        } /*eslint-enable no-empty*/

        return newIndex;
    }

    function navFrom(row, col, e) {
        // if nothing changes great we'll stay where we are
        var newRow = row;
        var newCol = col;
        var isSeek = ctrlOrCmd(e);
        var isLeftwardEdge, isRightwardEdge, isUpwardEdge, isDownwardEdge, cellHasValue, startedDefined;
        if (isSeek) {
            cellHasValue = function (r, c) {
                if (r === undefined || c === undefined) {
                    return false;
                }

                return !!grid.dataModel.get(r, c).formatted;
            };
            isLeftwardEdge = function (c) {
                return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.left(c));
            };
            isRightwardEdge = function (c) {
                return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.right(c));
            };
            isUpwardEdge = function (r) {
                return cellHasValue(r, newCol) && !cellHasValue(grid.data.up(r), newCol);
            };
            isDownwardEdge = function (r) {
                return cellHasValue(r, newCol) && !cellHasValue(grid.data.down(r), newCol);
            };
            startedDefined = cellHasValue(newRow, newCol);
        }
        switch (e.which) {
            case arrow.down.code:
                if (isSeek) {
                    newRow = seekNextEdge(newRow, startedDefined, isDownwardEdge, isUpwardEdge, grid.data.down);
                } else {
                    newRow = grid.data.down(newRow);
                }
                break;
            case arrow.up.code:
                if (isSeek) {
                    newRow = seekNextEdge(newRow, startedDefined, isUpwardEdge, isDownwardEdge, grid.data.up);
                } else {
                    newRow = grid.data.up(newRow);
                }
                break;
            case arrow.right.code:
                if (isSeek) {
                    newCol = seekNextEdge(newCol, startedDefined, isRightwardEdge, isLeftwardEdge, grid.data.right);
                } else {
                    newCol = grid.data.right(newCol);
                }
                break;
            case arrow.left.code:
                if (isSeek) {
                    newCol = seekNextEdge(newCol, startedDefined, isLeftwardEdge, isRightwardEdge, grid.data.left);
                } else {
                    newCol = grid.data.left(newCol);
                }
                break;
        }
        if (newRow === undefined) {
            newRow = row;
        }
        if (newCol === undefined) {
            newCol = col;
        }
        return {
            row: newRow,
            col: newCol
        };
    }

    model._navFrom = navFrom;

    model.handleTabEvent = function (e) {
        var newCol = model.focus.col;
        var newRow = model.focus.row;
        if (!e || !e.shiftKey) {
            if (newCol === grid.data.col.count() - 1) {
                newRow = grid.data.down(newRow);
                newCol = 0;
            } else {
                newCol = grid.data.right(newCol);
            }
        } else {
            if (newCol === 0) {
                newRow = grid.data.up(newRow);
                newCol = grid.data.col.count() - 1;
            } else {
                newCol = grid.data.left(newCol);
            }
        }
        model.setFocus(newRow, newCol);
        e.preventDefault();
    }

    grid.eventLoop.bind('keydown', function (e) {
        if (!grid.focused) {
            return;
        }
        // handle tab
        if (key.is(key.code.special.tab, e.which)) {
            model.handleTabEvent(e);
            return;
        }

        if (!key.is(arrow, e.which)) {
            return;
        }
        // focus logic

        if (!e.shiftKey) {
            var newFocus = navFrom(model.focus.row, model.focus.col, e);
            model.setFocus(newFocus.row, newFocus.col, e);
        } else {
            // selection logic
            var newSelection;
            // stand in for if it's cleared
            if (model.selection.top === -1) {
                newSelection = {
                    top: model.focus.row,
                    left: model.focus.col,
                    height: 1,
                    width: 1
                };
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
            setSelectionFromPoints(model.focus.row, model.focus.col, newRowCol.row, newRowCol.col);
            grid.cellScrollModel.scrollIntoView(newRowCol.row, newRowCol.col);
        }
    });

    function isNavableMouseEvent(e) {
        var target = e.target;
        // if there's no target let it through because that only happens in unit tests,
        // or if it happened in real world it wouldn't have a valid row or col and so wouldn't do anything anyway
        return !target || grid.eventIsOnCells(e) && e.button !== 2;
    }

    function isCheckboxModeForRowCol(row, col) {
        return model.checkboxModeFor.rows && col < 0 || (row < 0 && colSelectable(col)) && model.checkboxModeFor.cols
    }

    grid.eventLoop.bind('mousedown', function (e) {
        if (!isNavableMouseEvent(e)) {
            return;
        }
        // assume the event has been annotated by the cell mouse model interceptor
        var row = e.row;
        var col = e.col;

        // if we're in checkbox mode pretend the user held command for header mousedowns only
        var isCheckboxMode = isCheckboxModeForRowCol(row, col);
        var ctrlOrCmdPressed = isCheckboxMode || ctrlOrCmd(e);

        if (e.shiftKey) {
            var fromRow = model.focus.row;
            var fromCol = model.focus.col;
            var toRow = row;
            var toCol = col;
            var wasSelected;
            if (toRow < 0) {
                var colDescriptor = grid.data.col.get(toCol);
                if (colDescriptor.selectable !== false) {
                    wasSelected = colDescriptor.selected;
                    fromRow = 0;
                    toRow = Infinity;
                }

            }
            if (toCol < 0) {
                wasSelected = grid.data.row.get(toRow).selected;
                fromCol = 0;
                toCol = Infinity;
            }

            selectFromFocusToCell(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed, wasSelected);
        } else {


            var focusRow = row;
            if (focusRow < 0) {
                focusRow = grid.view.row.toData(grid.rowModel.numHeaders());
            }
            var focusCol = col;
            if (focusCol < 0) {
                focusCol = grid.view.col.toData(grid.colModel.numHeaders());
            }

            var headerSelectionRange = createHeaderSelectionRange(row, col);
            if (headerSelectionRange) {
                var prevSelections = findFullRowOrColSelections(headerSelectionRange);
                if (prevSelections.length && isCheckboxMode) {
                    var selectAll = headerSelectionRange.width === Infinity && headerSelectionRange.height === Infinity && !(grid.rowModel.allSelected() || grid.colModel.allSelected());
                    prevSelections.forEach(function (prevSelection) {
                        removeFullRowOrColFromSelection(prevSelection, headerSelectionRange);
                    });
                    if (selectAll) {
                        model.setSelection(headerSelectionRange);
                    }
                    model.setFocus(focusRow, focusCol, true, true);
                } else {
                    if (ctrlOrCmdPressed && !selectionIsFocus(model.selection)) {
                        addSelection(model.selection);
                    } else {
                        clearOtherSelections();
                    }
                    model.setFocus(focusRow, focusCol, ctrlOrCmdPressed);
                    model.setSelection(headerSelectionRange);
                }

            } else {
                if (ctrlOrCmdPressed) {
                    addSelection(model.selection);
                }
                model.setFocus(focusRow, focusCol, ctrlOrCmdPressed);
            }
        }
    });

    function selectFromFocusToCell(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed, wasSelected) {
        var isCheckboxMode = (fromRow === 0 && toRow === Infinity && model.checkboxModeFor.cols) ||
            (fromCol === 0 && toCol === Infinity && model.checkboxModeFor.rows);
        if (!wasSelected || !isCheckboxMode) {
            setSelectionFromPoints(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed);
        } else {
            var range = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
            var prevSelections = findFullRowOrColSelections(range);
            if (prevSelections.length) {
                prevSelections.forEach(function (prevSelection) {
                    removeFullRowOrColFromSelection(prevSelection, range);
                });
            }
        }
    }

    function colSelectable(col) {
        var colDescriptor = grid.data.col.get(col);
        return colDescriptor && colDescriptor.selectable !== false;
    }

    function createHeaderSelectionRange(row, col) {
        var headerSelectionRange;
        if (row < 0 && col < 0) {
            headerSelectionRange = rangeUtil.createFromPoints(0, 0, Infinity, Infinity);
        } else if (row < 0) {
            if (colSelectable(col)) {
                headerSelectionRange = rangeUtil.createFromPoints(0, col, Infinity, col);
            }
        } else if (col < 0) {
            headerSelectionRange = rangeUtil.createFromPoints(row, 0, row, Infinity);
        }
        return headerSelectionRange;
    }

    function findSelectionByRange(range) {
        return model.getAllSelections().filter(function (selection) {
            return rangeUtil.equal(selection, range);
        })[0];
    }

    function addOrSetSelection(selection) {
        if (!selectionIsFocus(model.selection)) {
            addSelection(selection);
        } else {
            model.setSelection(selection);
        }
    }



    function removeFullRowOrColFromSelection(selection, rowOrCol) {

        if (rowOrCol.width === Infinity) { // row
            var newSelections = [];
            if (selection.top < rowOrCol.top) { // we need a selection for the top portion
                var newSelection = {
                    top: selection.top,
                    height: rowOrCol.top - selection.top,
                    left: selection.left,
                    width: selection.width
                };
                newSelections.push(newSelection);
            }

            var bottomRow = selection.top + selection.height - 1;
            if (bottomRow > rowOrCol.top + rowOrCol.height - 1) { // we need a selection for the bottom portion
                newSelections.push({
                    top: rowOrCol.top + rowOrCol.height,
                    height: bottomRow - (rowOrCol.top + rowOrCol.height - 1),
                    left: selection.left,
                    width: selection.width
                });
            }
            removeSelection(selection);
            newSelections.forEach(addOrSetSelection);
            syncSelectionToHeaders();
        }

        if (rowOrCol.height === Infinity) { // col
        }
    }

    function findFullRowOrColSelections(range) {
        return model.getAllSelections().filter(function (selection) {
            return (selection.height === Infinity && selection.top === 0 && rangeUtil.intersect([selection.left, selection.width], [range.left, range.width])) ||
                (selection.width === Infinity && selection.left === 0 && rangeUtil.intersect([selection.top, selection.height], [range.top, range.height]));
        });
    }

    function addSelection(range) {
        model.otherSelections.push(createAndAddSelectionDecorator(range.top, range.left, range.height, range.width));
    }

    model._rowSelectionClasses = [];
    model._colSelectionClasses = [];
    // row col selection
    function handleRowColSelectionChange(rowOrCol) {
        var decoratorsField = ('_' + rowOrCol + 'SelectionClasses');
        model[decoratorsField].forEach(function (selectionDecorator) {
            grid.cellClasses.remove(selectionDecorator);
        });
        model[decoratorsField] = [];

        if (grid[rowOrCol + 'Model'].allSelected()) {
            var top = rowOrCol === 'row' ? Infinity : 0;
            var left = rowOrCol === 'col' ? Infinity : 0;
            var decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
            grid.cellClasses.add(decorator);
            model[decoratorsField].push(decorator);
        } else {
            grid[rowOrCol + 'Model'].getSelected().forEach(function (index) {
                var virtualIndex = grid[rowOrCol + 'Model'].toVirtual(index);
                var top = rowOrCol === 'row' ? virtualIndex : 0;
                var left = rowOrCol === 'col' ? virtualIndex : 0;
                var decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
                grid.cellClasses.add(decorator);
                model[decoratorsField].push(decorator);
            });
        }
    }

    grid.eventLoop.bind('grid-row-selection-change', function () {
        handleRowColSelectionChange('row');
    });

    grid.eventLoop.bind('grid-col-selection-change', function () {
        handleRowColSelectionChange('col');
    });

    function createAndAddSelectionDecorator() {
        var selection = grid.decorators.create.apply(this, arguments);
        var defaultRender = selection.render;
        selection.render = function () {
            var div = defaultRender();
            div.setAttribute('class', 'grid-selection');
            return div;
        };
        grid.decorators.add(selection);
        return selection;
    }

    var selection = createAndAddSelectionDecorator();

    function syncSelectionToHeaders() {
        grid.colModel.clearSelected(true);
        grid.rowModel.clearSelected(true);
        model.getAllSelections().forEach(function (selection) {
            if (selection) {
                maybeSelectHeaderFromSelection(selection);
            }
        });
    }

    model.getAllSelections = function () {
        var selections = [];
        if (model.selection) {
            selections.push(model.selection);
        }
        return selections.concat(model.otherSelections);
    };

    function maybeSelectHeaderFromSelection(range, deselect) {
        var indexes;
        if (range.top === 0 && range.height === Infinity) {
            indexes = grid.data.col.indexes({
                from: range.left,
                length: range.width
            });
            if (deselect) {
                grid.colModel.deselect(indexes);
            } else {
                grid.colModel.select(indexes);
            }
        }
        if (range.left === 0 && range.width === Infinity) {
            indexes = grid.data.row.indexes({
                from: range.top,
                length: range.height
            });
            if (deselect) {
                grid.rowModel.deselect(indexes);
            } else {
                grid.rowModel.select(indexes);
            }
        }
    }

    function selectionIsFocus(selection) {
        return selection.height === 1 && selection.width === 1 && !model.otherSelections.length;
    }

    model.setSelection = function setSelection(newSelection) {
        var height = newSelection.height;
        var width = newSelection.width;
        if (selectionIsFocus(newSelection)) {
            height = -1;
            width = -1;
        }
        selection.top = newSelection.top;
        selection.left = newSelection.left;
        selection.height = height;
        selection.width = width;
        // select the columns to match
        syncSelectionToHeaders();
    };


    function setSelectionToFocus() {
        model.setSelection({
            top: model.focus.row,
            left: model.focus.col,
            height: 1,
            width: 1
        });
    }

    function clearOtherSelections() {
        grid.decorators.remove(model.otherSelections);
        model.otherSelections = [];
        syncSelectionToHeaders();
    }

    function removeSelection(selection) {
        if (rangeUtil.equal(selection, model.selection)) {
            if (model.otherSelections.length) {
                var lastSelection = model.otherSelections.pop();
                grid.decorators.remove(lastSelection);
                model.setSelection(lastSelection);
            } else {
                setSelectionToFocus();
            }
        } else {
            var index = model.otherSelections.indexOf(selection);
            if (index !== -1) {
                model.otherSelections.splice(index, 1);
                grid.decorators.remove(selection);
            }
        }
        syncSelectionToHeaders();
    }

    function setSelectionFromPoints(fromRow, fromCol, toRow, toCol, dontClearOthers) {
        if (!dontClearOthers) {
            clearOtherSelections();
        }
        toRow = util.clamp(toRow, 0, Infinity);
        toCol = util.clamp(toCol, 0, Infinity);
        var newSelection = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
        model.setSelection(newSelection);
    }

    selection._onDragStart = function (e) {
        if (!isNavableMouseEvent(e)) {
            return;
        }
        if (e.enableAutoScroll) {
            e.enableAutoScroll();
        }
        var fromRow = model.focus.row;
        var fromCol = model.focus.col;
        var startCol = e.col;
        var startRow = e.row;
        var wasSelected;
        var toRow, toCol;
        if (startRow < 0) {
            // these are notted because mousedwon actually inverts the intial selection
            wasSelected = !grid.data.col.get(startCol).selected;
            fromRow = 0;
            toRow = Infinity;

        }
        if (startCol < 0) {
            // these are notted because mousedwon actually inverts the intial selection
            wasSelected = !grid.data.row.get(startRow).selected;
            fromCol = 0;
            toCol = Infinity;
        }
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
            toRow = toRow !== Infinity ? e.row : toRow;
            toCol = toCol !== Infinity ? e.col : toCol;
            if (toCol !== Infinity && !colSelectable(toCol)) {
                return;
            }

            var fixedRows = grid.rowModel.numFixed(true);
            if (startRow < fixedRows && toRow > fixedRows && toRow !== Infinity) {
                startRow = toRow = grid.rowModel.numFixed();
                grid.cellScrollModel.scrollTo(0, grid.cellScrollModel.col);
            }
            var fixedCols = grid.colModel.numFixed(true);
            if (startCol < fixedCols && toCol > fixedCols && toCol !== Infinity) {
                startCol = toCol = grid.colModel.numFixed();
                grid.cellScrollModel.scrollTo(grid.cellScrollModel.row, 0);
            }
            if (isNaN(toRow) || isNaN(toCol)) {
                return; //don't try to select when NaN
            }
            selectFromFocusToCell(fromRow, fromCol, toRow, toCol, true, wasSelected); // always pass true because if it was to be cleared mousedown should have handled that
        });
        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };

    grid.eventLoop.bind('grid-drag-start', selection._onDragStart);
    setSelectionToFocus();
    model._selectionDecorator = selection;

    Object.defineProperty(model, 'selection', {
        get: function () {
            if (selection.height === -1) { // cleared selection default to focus
                return {
                    top: model.focus.row,
                    left: model.focus.col,
                    height: 1,
                    width: 1
                };
            }
            return selection;
        }
    });

    model.getAllSelectedRanges = function () {
        var selectionRange = grid.navigationModel.selection;
        // valid selection range cannot go to -1
        if (selectionRange.top === -1) {
            selectionRange = {
                top: grid.navigationModel.focus.row,
                left: grid.navigationModel.focus.col,
                width: 1,
                height: 1
            };
        }
        return [selectionRange].concat(model.otherSelections);
    };

    model.clearSelection = function () {
        clearOtherSelections();
        setSelectionToFocus();
    }

    function clearSelectionFromModelChange(e) {
        if (e.action === 'size') { // don't clear for resize but all other changes for now will clear selection
            return;
        }
        model.clearSelection();

    }

    grid.eventLoop.bind('grid-col-change', clearSelectionFromModelChange);
    grid.eventLoop.bind('grid-row-change', clearSelectionFromModelChange);
    return model;
};
