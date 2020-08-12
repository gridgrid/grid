"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ctrl_or_cmd_1 = require("../ctrl-or-cmd");
var rangeUtil = require("../range-util");
var util = require("../util");
var key = require('key');
var arrow = key.code.arrow;
function create(grid) {
    var mainSelection = createAndAddSelectionDecorator(0, 0, -1, -1);
    var model = {
        focus: {
            row: 0,
            col: 0
        },
        get selection() {
            if (mainSelection.height === -1) {
                return {
                    top: model.focus.row,
                    left: model.focus.col,
                    height: 1,
                    width: 1
                };
            }
            return mainSelection;
        },
        otherSelections: [],
        checkboxModeFor: {},
        _selectionDecorator: mainSelection,
        focusDecorator: grid.decorators.create(0, 0, 1, 1),
        _rowSelectionClasses: [],
        _colSelectionClasses: [],
        getAllSelections: function () {
            var selections = [];
            if (model.selection) {
                selections.push(model.selection);
            }
            return selections.concat(model.otherSelections);
        },
        setFocus: function (inputRow, inputCol, dontClearSelection, dontSetSelection) {
            inputRow = inputRow && grid.data.row.clamp(inputRow);
            var row = (typeof inputRow !== 'number' || isNaN(inputRow)) ? model.focus.row : inputRow;
            inputCol = inputCol && grid.data.col.clamp(inputCol);
            var col = (typeof inputCol !== 'number' || isNaN(inputCol)) ? model.focus.row : inputCol;
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
        },
        _navFrom: navFrom,
        handleTabEvent: function (e) {
            var newCol = model.focus.col;
            var newRow = model.focus.row;
            if (!e || !e.shiftKey) {
                if (newCol === grid.data.col.count() - 1) {
                    newRow = grid.data.down(newRow);
                    newCol = 0;
                }
                else {
                    newCol = grid.data.right(newCol);
                }
            }
            else {
                if (newCol === 0) {
                    newRow = grid.data.up(newRow);
                    newCol = grid.data.col.count() - 1;
                }
                else {
                    newCol = grid.data.left(newCol);
                }
            }
            model.setFocus(newRow, newCol);
            e.preventDefault();
        },
        setSelection: function (newSelection) {
            var height = newSelection.height;
            var width = newSelection.width;
            if (selectionIsFocus(newSelection)) {
                height = -1;
                width = -1;
            }
            mainSelection.top = newSelection.top;
            mainSelection.left = newSelection.left;
            mainSelection.height = height;
            mainSelection.width = width;
            syncSelectionToHeaders();
        },
        getAllSelectedRanges: function () {
            var selectionRange = grid.navigationModel.selection;
            if (selectionRange.top === -1) {
                selectionRange = {
                    top: grid.navigationModel.focus.row,
                    left: grid.navigationModel.focus.col,
                    width: 1,
                    height: 1
                };
            }
            return [selectionRange].concat(model.otherSelections);
        },
        clearSelection: function () {
            clearOtherSelections();
            setSelectionToFocus();
        },
    };
    var focusClass = grid.cellClasses.create(0, 0, 'focus');
    grid.cellClasses.add(focusClass);
    model.focusDecorator.postRender = function (div) {
        div.setAttribute('class', 'grid-focus-decorator');
        return div;
    };
    grid.decorators.add(model.focusDecorator);
    function seekNextEdge(newIndex, startedDefined, isForwardEdge, isBackwardEdge, goForward) {
        var isEdgeToSeek = (isForwardEdge(newIndex) || !startedDefined) &&
            isBackwardEdge ||
            isForwardEdge;
        while (newIndex !== undefined && goForward(newIndex) !== undefined && !isEdgeToSeek(newIndex = goForward(newIndex))) {
        }
        return newIndex;
    }
    function navFrom(row, col, e) {
        var newRow = row;
        var newCol = col;
        var isSeek = ctrl_or_cmd_1.default(e);
        if (isSeek) {
            var cellHasValue_1 = function (r, c) {
                if (r === undefined || c === undefined) {
                    return false;
                }
                return !!grid.dataModel.get(r, c).formatted;
            };
            var isLeftwardEdge = function (c) {
                return cellHasValue_1(newRow, c) && !cellHasValue_1(newRow, grid.data.left(c));
            };
            var isRightwardEdge = function (c) {
                return cellHasValue_1(newRow, c) && !cellHasValue_1(newRow, grid.data.right(c));
            };
            var isUpwardEdge = function (r) {
                return cellHasValue_1(r, newCol) && !cellHasValue_1(grid.data.up(r), newCol);
            };
            var isDownwardEdge = function (r) {
                return cellHasValue_1(r, newCol) && !cellHasValue_1(grid.data.down(r), newCol);
            };
            var startedDefined = cellHasValue_1(newRow, newCol);
            switch (e.which) {
                case arrow.down.code:
                    newRow = seekNextEdge(newRow, startedDefined, isDownwardEdge, isUpwardEdge, grid.data.down);
                    break;
                case arrow.up.code:
                    newRow = seekNextEdge(newRow, startedDefined, isUpwardEdge, isDownwardEdge, grid.data.up);
                    break;
                case arrow.right.code:
                    newCol = seekNextEdge(newCol, startedDefined, isRightwardEdge, isLeftwardEdge, grid.data.right);
                    break;
                case arrow.left.code:
                    newCol = seekNextEdge(newCol, startedDefined, isLeftwardEdge, isRightwardEdge, grid.data.left);
                    break;
            }
        }
        else {
            switch (e.which) {
                case arrow.down.code:
                    newRow = grid.data.down(newRow);
                    break;
                case arrow.up.code:
                    newRow = grid.data.up(newRow);
                    break;
                case arrow.right.code:
                    newCol = grid.data.right(newCol);
                    break;
                case arrow.left.code:
                    newCol = grid.data.left(newCol);
                    break;
            }
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
    grid.eventLoop.bind('keydown', function (e) {
        if (!grid.focused) {
            return;
        }
        if (key.is(key.code.special.tab, e.which)) {
            model.handleTabEvent(e);
            return;
        }
        if (!key.is(arrow, e.which)) {
            return;
        }
        if (!e.shiftKey) {
            var newFocus = navFrom(model.focus.row, model.focus.col, e);
            model.setFocus(newFocus.row, newFocus.col, true);
        }
        else {
            var newSelection = void 0;
            if (model.selection.top === -1) {
                newSelection = {
                    top: model.focus.row,
                    left: model.focus.col,
                    height: 1,
                    width: 1
                };
            }
            else {
                newSelection = {
                    top: model.selection.top,
                    left: model.selection.left,
                    height: model.selection.height,
                    width: model.selection.width
                };
            }
            var navFromRow = (model.focus.row === newSelection.top) ?
                newSelection.top + newSelection.height - 1 :
                newSelection.top;
            var navFromCol = (model.focus.col === newSelection.left) ?
                newSelection.left + newSelection.width - 1 :
                newSelection.left;
            var newRowCol = navFrom(navFromRow, navFromCol, e);
            setSelectionFromPoints(model.focus.row, model.focus.col, newRowCol.row, newRowCol.col);
            grid.cellScrollModel.scrollIntoView(newRowCol.row, newRowCol.col);
        }
    });
    function isNavableMouseEvent(e) {
        var target = e.target;
        return !target || grid.eventIsOnCells(e) && e.button !== 2;
    }
    function isCheckboxModeForRowCol(row, col) {
        return model.checkboxModeFor.rows && col < 0 || (row < 0 && colSelectable(col)) && model.checkboxModeFor.cols;
    }
    grid.eventLoop.bind('mousedown', function (e) {
        if (!isNavableMouseEvent(e)) {
            return;
        }
        var row = e.row;
        var col = e.col;
        var isCheckboxMode = isCheckboxModeForRowCol(row, col);
        var ctrlOrCmdPressed = isCheckboxMode || ctrl_or_cmd_1.default(e);
        if (e.shiftKey) {
            var fromRow = model.focus.row;
            var fromCol = model.focus.col;
            var toRow = row;
            var toCol = col;
            var wasSelected = void 0;
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
        }
        else {
            var focusRow = row;
            if (focusRow < 0) {
                focusRow = grid.view.row.toData(grid.rowModel.numHeaders());
            }
            var focusCol = col;
            if (focusCol < 0) {
                focusCol = grid.view.col.toData(grid.colModel.numHeaders());
            }
            var headerSelectionRange_1 = createHeaderSelectionRange(row, col);
            if (headerSelectionRange_1) {
                var prevSelections = findFullRowOrColSelections(headerSelectionRange_1);
                if (prevSelections.length && isCheckboxMode) {
                    var selectAll = headerSelectionRange_1.width === Infinity &&
                        headerSelectionRange_1.height === Infinity &&
                        !(grid.rowModel.allSelected() || grid.colModel.allSelected());
                    prevSelections.forEach(function (prevSelection) {
                        removeFullRowOrColFromSelection(prevSelection, headerSelectionRange_1);
                    });
                    if (selectAll) {
                        model.setSelection(headerSelectionRange_1);
                    }
                    model.setFocus(focusRow, focusCol, true, true);
                }
                else {
                    if (ctrlOrCmdPressed && !selectionIsFocus(model.selection)) {
                        addSelection(model.selection);
                    }
                    else {
                        clearOtherSelections();
                    }
                    model.setFocus(focusRow, focusCol, ctrlOrCmdPressed);
                    model.setSelection(headerSelectionRange_1);
                }
            }
            else {
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
        }
        else {
            var range_1 = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
            var prevSelections = findFullRowOrColSelections(range_1);
            if (prevSelections.length) {
                prevSelections.forEach(function (prevSelection) {
                    removeFullRowOrColFromSelection(prevSelection, range_1);
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
        }
        else if (row < 0) {
            if (colSelectable(col)) {
                headerSelectionRange = rangeUtil.createFromPoints(0, col, Infinity, col);
            }
        }
        else if (col < 0) {
            headerSelectionRange = rangeUtil.createFromPoints(row, 0, row, Infinity);
        }
        return headerSelectionRange;
    }
    function addOrSetSelection(selection) {
        if (!selectionIsFocus(model.selection)) {
            addSelection(selection);
        }
        else {
            model.setSelection(selection);
        }
    }
    function removeFullRowOrColFromSelection(selection, rowOrCol) {
        if (rowOrCol.width === Infinity) {
            var newSelections = [];
            if (selection.top < rowOrCol.top) {
                var newSelection = {
                    top: selection.top,
                    height: rowOrCol.top - selection.top,
                    left: selection.left,
                    width: selection.width
                };
                newSelections.push(newSelection);
            }
            var bottomRow = selection.top + selection.height - 1;
            if (bottomRow > rowOrCol.top + rowOrCol.height - 1) {
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
        if (rowOrCol.height === Infinity) {
        }
    }
    function findFullRowOrColSelections(range) {
        return model.getAllSelections().filter(function (selection) {
            return (selection.height === Infinity &&
                selection.top === 0 &&
                rangeUtil.intersect([selection.left, selection.width], [range.left, range.width]))
                ||
                    (selection.width === Infinity &&
                        selection.left === 0 &&
                        rangeUtil.intersect([selection.top, selection.height], [range.top, range.height]));
        });
    }
    function addSelection(range) {
        model.otherSelections.push(createAndAddSelectionDecorator(range.top, range.left, range.height, range.width));
    }
    function handleRowColSelectionChange(rowOrCol) {
        var decoratorsField = rowOrCol === 'row' ? '_rowSelectionClasses' : '_colSelectionClasses';
        var rowColModelField = rowOrCol === 'row' ? 'rowModel' : 'colModel';
        model[decoratorsField].forEach(function (selectionDecorator) {
            grid.cellClasses.remove(selectionDecorator);
        });
        model[decoratorsField] = [];
        if (grid[rowColModelField].allSelected()) {
            var top_1 = rowOrCol === 'row' ? Infinity : 0;
            var left = rowOrCol === 'col' ? Infinity : 0;
            var decorator = grid.cellClasses.create(top_1, left, 'selected', 1, 1, 'virtual');
            grid.cellClasses.add(decorator);
            model[decoratorsField].push(decorator);
        }
        else {
            grid[rowColModelField].getSelected().forEach(function (index) {
                var virtualIndex = grid[rowColModelField].toVirtual(index);
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
    function createAndAddSelectionDecorator(t, l, h, w) {
        var selection = grid.decorators.create(t, l, h, w);
        var defaultRender = selection.render;
        selection.render = function () {
            var div = defaultRender();
            div.setAttribute('class', 'grid-selection');
            return div;
        };
        grid.decorators.add(selection);
        return selection;
    }
    function syncSelectionToHeaders() {
        grid.colModel.clearSelected();
        grid.rowModel.clearSelected();
        model.getAllSelections().forEach(function (s) {
            if (s) {
                maybeSelectHeaderFromSelection(s);
            }
        });
    }
    function maybeSelectHeaderFromSelection(range, deselect) {
        var indexes;
        if (range.top === 0 && range.height === Infinity) {
            indexes = grid.data.col.indexes({
                from: range.left,
                length: range.width
            });
            if (deselect) {
                grid.colModel.deselect(indexes);
            }
            else {
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
            }
            else {
                grid.rowModel.select(indexes);
            }
        }
    }
    function selectionIsFocus(s) {
        return s.height === 1 && s.width === 1 && !model.otherSelections.length;
    }
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
    function isDecorator(s) {
        return !!s.space;
    }
    function removeSelection(selectionToRemove) {
        if (rangeUtil.equal(selectionToRemove, model.selection)) {
            if (model.otherSelections.length) {
                var lastSelection = model.otherSelections.pop();
                grid.decorators.remove(lastSelection);
                model.setSelection(lastSelection);
            }
            else {
                setSelectionToFocus();
            }
        }
        else if (isDecorator(selectionToRemove)) {
            var index = model.otherSelections.indexOf(selectionToRemove);
            if (index !== -1) {
                model.otherSelections.splice(index, 1);
                grid.decorators.remove(selectionToRemove);
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
    mainSelection._onDragStart = function (e) {
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
        var toRow;
        var toCol;
        if (startRow < 0) {
            wasSelected = !grid.data.col.get(startCol).selected;
            fromRow = 0;
            toRow = Infinity;
        }
        if (startCol < 0) {
            wasSelected = !grid.data.row.get(startRow).selected;
            fromCol = 0;
            toCol = Infinity;
        }
        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (gridCellDrag) {
            toRow = toRow !== Infinity ? gridCellDrag.row : toRow;
            toCol = toCol !== Infinity ? gridCellDrag.col : toCol;
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
                return;
            }
            selectFromFocusToCell(fromRow, fromCol, toRow, toCol, true, wasSelected);
        });
        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            unbindDrag();
            unbindDragEnd();
        });
    };
    grid.eventLoop.bind('grid-drag-start', mainSelection._onDragStart);
    setSelectionToFocus();
    function clearSelectionFromModelChange(e) {
        if (e.action === 'size') {
            return;
        }
        model.clearSelection();
    }
    grid.eventLoop.bind('grid-col-change', clearSelectionFromModelChange);
    grid.eventLoop.bind('grid-row-change', clearSelectionFromModelChange);
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map