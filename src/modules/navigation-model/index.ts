import { IRowColEvent } from '../abstract-row-col-model';
import { ICellClassDescriptor } from '../cell-classes';
import { Grid } from '../core';
import ctrlOrCmd from '../ctrl-or-cmd';
import { IDecorator } from '../decorators';
import { AnnotatedMouseEventUnion, AnnotatedMouseOrKeyEventUnion, IGridCustomMouseEvent, IGridDragStartEvent } from '../event-loop';
import { RawPositionRange } from '../position-range';
import * as rangeUtil from '../range-util';
import * as util from '../util';

const key = require('key');
const arrow = key.code.arrow;

export interface ISelectionDecorator extends IDecorator {
  top: number;
  left: number;
  width: number;
  height: number;
  _onDragStart?(e: IGridDragStartEvent): void;
}

export interface IFocus {
  row: number;
  col: number;
}

export interface INavigationModel {
  focus: IFocus;
  selection: RawPositionRange;
  otherSelections: ISelectionDecorator[];
  checkboxModeFor: {
    rows?: boolean;
    cols?: boolean;
  };
  _selectionDecorator: ISelectionDecorator;
  focusDecorator: IDecorator;
  _rowSelectionClasses: ICellClassDescriptor[];
  _colSelectionClasses: ICellClassDescriptor[];
  getAllSelections(): Array<RawPositionRange | ISelectionDecorator>;
  getAllSelectedRanges(): RawPositionRange[];
  clearSelection(): void;
  setSelection(r: RawPositionRange): void;
  setFocus(row: number | undefined, col: number | undefined, dontClearSelection?: boolean, dontSetSelection?: boolean): void;
  _navFrom(row: number, col: number, e: AnnotatedMouseOrKeyEventUnion): IFocus;
  handleTabEvent(e: AnnotatedMouseOrKeyEventUnion): void;
}

export function create(grid: Grid) {
  const mainSelection = createAndAddSelectionDecorator(0, 0, -1, -1);
  const model: INavigationModel = {
    focus: {
      row: 0,
      col: 0
    },
    get selection() {
      if (mainSelection.height === -1) { // cleared selection default to focus
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
    getAllSelections() {
      const selections = [];
      if (model.selection) {
        selections.push(model.selection);
      }
      return selections.concat(model.otherSelections);
    },
    setFocus(inputRow?: number, inputCol?: number, dontClearSelection?: boolean, dontSetSelection?: boolean) {
      inputRow = inputRow && grid.data.row.clamp(inputRow);
      const row = (typeof inputRow !== 'number' || isNaN(inputRow)) ? model.focus.row : inputRow;

      inputCol = inputCol && grid.data.col.clamp(inputCol);
      const col = (typeof inputCol !== 'number' || isNaN(inputCol)) ? model.focus.row : inputCol;

      const changed = row !== model.focus.row || col !== model.focus.col;
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
    handleTabEvent(e: AnnotatedMouseOrKeyEventUnion) {
      let newCol: number | undefined = model.focus.col;
      let newRow: number | undefined = model.focus.row;
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
    },
    setSelection(newSelection: RawPositionRange) {
      let height = newSelection.height;
      let width = newSelection.width;
      if (selectionIsFocus(newSelection)) {
        height = -1;
        width = -1;
      }
      mainSelection.top = newSelection.top;
      mainSelection.left = newSelection.left;
      mainSelection.height = height;
      mainSelection.width = width;
      // select the columns to match
      syncSelectionToHeaders();
    },
    getAllSelectedRanges() {
      let selectionRange = grid.navigationModel.selection;
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
    },

    clearSelection() {
      clearOtherSelections();
      setSelectionToFocus();
    },
  };

  const focusClass = grid.cellClasses.create(0, 0, 'focus');
  grid.cellClasses.add(focusClass);

  model.focusDecorator.postRender = (div) => {
    div.setAttribute('class', 'grid-focus-decorator');
    return div;
  };
  grid.decorators.add(model.focusDecorator);

  function seekNextEdge(
    newIndex: number | undefined,
    startedDefined: boolean,
    isForwardEdge: (i?: number) => boolean,
    isBackwardEdge: (i?: number) => boolean,
    goForward: (i: number) => number | undefined
  ) {
    const isEdgeToSeek = (isForwardEdge(newIndex) || !startedDefined) &&
      isBackwardEdge ||
      isForwardEdge;

    // tslint:disable-next-line:no-conditional-assignment
    while (newIndex !== undefined && goForward(newIndex) !== undefined && !isEdgeToSeek(newIndex = goForward(newIndex))) {
      // empty
    }

    return newIndex;
  }

  function navFrom(row: number, col: number, e: AnnotatedMouseOrKeyEventUnion) {
    // if nothing changes great we'll stay where we are
    let newRow: number | undefined = row;
    let newCol: number | undefined = col;
    const isSeek = ctrlOrCmd(e);
    // tslint:disable-next-line:one-variable-per-declaration
    if (isSeek) {
      const cellHasValue = (r?: number, c?: number) => {
        if (r === undefined || c === undefined) {
          return false;
        }

        return !!grid.dataModel.get(r, c).formatted;
      };
      const isLeftwardEdge = (c: number) => {
        return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.left(c));
      };
      const isRightwardEdge = (c: number) => {
        return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.right(c));
      };
      const isUpwardEdge = (r: number) => {
        return cellHasValue(r, newCol) && !cellHasValue(grid.data.up(r), newCol);
      };
      const isDownwardEdge = (r: number) => {
        return cellHasValue(r, newCol) && !cellHasValue(grid.data.down(r), newCol);
      };
      const startedDefined = cellHasValue(newRow, newCol);
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
    } else {
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

  grid.eventLoop.bind('keydown', (e) => {
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
      const newFocus = navFrom(model.focus.row, model.focus.col, e);
      model.setFocus(newFocus.row, newFocus.col, true);
    } else {
      // selection logic
      let newSelection;
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
      const navFromRow = (model.focus.row === newSelection.top) ?
        newSelection.top + newSelection.height - 1 :
        newSelection.top;

      const navFromCol = (model.focus.col === newSelection.left) ?
        newSelection.left + newSelection.width - 1 :
        newSelection.left;
      const newRowCol = navFrom(navFromRow, navFromCol, e);
      setSelectionFromPoints(model.focus.row, model.focus.col, newRowCol.row, newRowCol.col);
      grid.cellScrollModel.scrollIntoView(newRowCol.row, newRowCol.col);
    }
  });

  function isNavableMouseEvent(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent) {
    const target = e.target;
    // if there's no target let it through because that only happens in unit tests,
    // or if it happened in real world it wouldn't have a valid row or col and so wouldn't do anything anyway
    return !target || grid.eventIsOnCells(e) && (e as AnnotatedMouseEventUnion).button !== 2;
  }

  function isCheckboxModeForRowCol(row: number, col: number) {
    return model.checkboxModeFor.rows && col < 0 || (row < 0 && colSelectable(col)) && model.checkboxModeFor.cols;
  }

  grid.eventLoop.bind('mousedown', (e) => {
    if (!isNavableMouseEvent(e)) {
      return;
    }
    // assume the event has been annotated by the cell mouse model interceptor
    const row = e.row;
    const col = e.col;

    // if we're in checkbox mode pretend the user held command for header mousedowns only
    const isCheckboxMode = isCheckboxModeForRowCol(row, col);
    const ctrlOrCmdPressed = isCheckboxMode || ctrlOrCmd(e);

    if (e.shiftKey) {
      let fromRow = model.focus.row;
      let fromCol = model.focus.col;
      let toRow = row;
      let toCol = col;
      let wasSelected;
      if (toRow < 0) {
        const colDescriptor = grid.data.col.get(toCol);
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

      let focusRow = row;
      if (focusRow < 0) {
        focusRow = grid.view.row.toData(grid.rowModel.numHeaders());
      }
      let focusCol = col;
      if (focusCol < 0) {
        focusCol = grid.view.col.toData(grid.colModel.numHeaders());
      }

      const headerSelectionRange = createHeaderSelectionRange(row, col);
      if (headerSelectionRange) {
        const prevSelections = findFullRowOrColSelections(headerSelectionRange);
        if (prevSelections.length && isCheckboxMode) {
          const selectAll = headerSelectionRange.width === Infinity &&
            headerSelectionRange.height === Infinity &&
            !(grid.rowModel.allSelected() || grid.colModel.allSelected());
          prevSelections.forEach((prevSelection) => {
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

  function selectFromFocusToCell(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    ctrlOrCmdPressed: boolean,
    wasSelected?: boolean
  ) {
    const isCheckboxMode = (fromRow === 0 && toRow === Infinity && model.checkboxModeFor.cols) ||
      (fromCol === 0 && toCol === Infinity && model.checkboxModeFor.rows);
    if (!wasSelected || !isCheckboxMode) {
      setSelectionFromPoints(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed);
    } else {
      const range = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
      const prevSelections = findFullRowOrColSelections(range);
      if (prevSelections.length) {
        prevSelections.forEach((prevSelection) => {
          removeFullRowOrColFromSelection(prevSelection, range);
        });
      }
    }
  }

  function colSelectable(col: number) {
    const colDescriptor = grid.data.col.get(col);
    return colDescriptor && colDescriptor.selectable !== false;
  }

  function createHeaderSelectionRange(row: number, col: number) {
    let headerSelectionRange;
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

  function addOrSetSelection(selection: RawPositionRange) {
    if (!selectionIsFocus(model.selection)) {
      addSelection(selection);
    } else {
      model.setSelection(selection);
    }
  }

  function removeFullRowOrColFromSelection(selection: RawPositionRange | ISelectionDecorator, rowOrCol: RawPositionRange) {

    if (rowOrCol.width === Infinity) { // row
      const newSelections = [];
      if (selection.top < rowOrCol.top) { // we need a selection for the top portion
        const newSelection = {
          top: selection.top,
          height: rowOrCol.top - selection.top,
          left: selection.left,
          width: selection.width
        };
        newSelections.push(newSelection);
      }

      const bottomRow = selection.top + selection.height - 1;
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

    if (rowOrCol.height === Infinity) {
      // TODO: col
    }
  }

  function findFullRowOrColSelections(range: RawPositionRange) {
    return model.getAllSelections().filter((selection) => {
      return (selection.height === Infinity &&
        selection.top === 0 &&
        rangeUtil.intersect([selection.left, selection.width], [range.left, range.width]))
        ||
        (selection.width === Infinity &&
          selection.left === 0 &&
          rangeUtil.intersect([selection.top, selection.height], [range.top, range.height]));
    });
  }

  function addSelection(range: RawPositionRange) {
    model.otherSelections.push(createAndAddSelectionDecorator(range.top, range.left, range.height, range.width));
  }

  // row col selection
  function handleRowColSelectionChange(rowOrCol: 'row' | 'col') {
    const decoratorsField = rowOrCol === 'row' ? '_rowSelectionClasses' : '_colSelectionClasses';
    const rowColModelField = rowOrCol === 'row' ? 'rowModel' : 'colModel';
    model[decoratorsField].forEach((selectionDecorator) => {
      grid.cellClasses.remove(selectionDecorator);
    });
    model[decoratorsField] = [];

    if (grid[rowColModelField].allSelected()) {
      const top = rowOrCol === 'row' ? Infinity : 0;
      const left = rowOrCol === 'col' ? Infinity : 0;
      const decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
      grid.cellClasses.add(decorator);
      model[decoratorsField].push(decorator);
    } else {
      grid[rowColModelField].getSelected().forEach((index) => {
        const virtualIndex = grid[rowColModelField].toVirtual(index);
        const top = rowOrCol === 'row' ? virtualIndex : 0;
        const left = rowOrCol === 'col' ? virtualIndex : 0;
        const decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
        grid.cellClasses.add(decorator);
        model[decoratorsField].push(decorator);
      });
    }
  }

  grid.eventLoop.bind('grid-row-selection-change', () => {
    handleRowColSelectionChange('row');
  });

  grid.eventLoop.bind('grid-col-selection-change', () => {
    handleRowColSelectionChange('col');
  });

  function createAndAddSelectionDecorator(t: number, l: number, h: number, w: number): ISelectionDecorator {
    const selection = grid.decorators.create(t, l, h, w);
    const defaultRender = selection.render;
    selection.render = () => {
      const div = defaultRender();
      div.setAttribute('class', 'grid-selection');
      return div;
    };
    grid.decorators.add(selection);
    return selection as ISelectionDecorator;
  }

  function syncSelectionToHeaders() {
    grid.colModel.clearSelected();
    grid.rowModel.clearSelected();
    model.getAllSelections().forEach((s) => {
      if (s) {
        maybeSelectHeaderFromSelection(s);
      }
    });
  }

  function maybeSelectHeaderFromSelection(range: RawPositionRange, deselect?: boolean) {
    let indexes;
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

  function selectionIsFocus(s: RawPositionRange) {
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

  function isDecorator(s: ISelectionDecorator | RawPositionRange): s is ISelectionDecorator {
    return !!(s as ISelectionDecorator).space;
  }

  function removeSelection(selectionToRemove: ISelectionDecorator | RawPositionRange) {
    if (rangeUtil.equal(selectionToRemove, model.selection)) {
      if (model.otherSelections.length) {
        const lastSelection = model.otherSelections.pop() as ISelectionDecorator;
        grid.decorators.remove(lastSelection);
        model.setSelection(lastSelection);
      } else {
        setSelectionToFocus();
      }
    } else if (isDecorator(selectionToRemove)) {
      const index = model.otherSelections.indexOf(selectionToRemove);
      if (index !== -1) {
        model.otherSelections.splice(index, 1);
        grid.decorators.remove(selectionToRemove);
      }
    }
    syncSelectionToHeaders();
  }

  function setSelectionFromPoints(fromRow: number, fromCol: number, toRow: number, toCol: number, dontClearOthers?: boolean) {
    if (!dontClearOthers) {
      clearOtherSelections();
    }
    toRow = util.clamp(toRow, 0, Infinity);
    toCol = util.clamp(toCol, 0, Infinity);
    const newSelection = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
    model.setSelection(newSelection);
  }

  mainSelection._onDragStart = (e) => {
    if (!isNavableMouseEvent(e)) {
      return;
    }
    if (e.enableAutoScroll) {
      e.enableAutoScroll();
    }
    let fromRow = model.focus.row;
    let fromCol = model.focus.col;
    let startCol = e.col;
    let startRow = e.row;
    let wasSelected: boolean | undefined;
    let toRow: number | undefined;
    let toCol: number | undefined;
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
    const unbindDrag = grid.eventLoop.bind('grid-cell-drag', (gridCellDrag) => {
      toRow = toRow !== Infinity ? gridCellDrag.row : toRow;
      toCol = toCol !== Infinity ? gridCellDrag.col : toCol;
      if (toCol !== Infinity && !colSelectable(toCol)) {
        return;
      }

      const fixedRows = grid.rowModel.numFixed(true);
      if (startRow < fixedRows && toRow > fixedRows && toRow !== Infinity) {
        startRow = toRow = grid.rowModel.numFixed();
        grid.cellScrollModel.scrollTo(0, grid.cellScrollModel.col);
      }
      const fixedCols = grid.colModel.numFixed(true);
      if (startCol < fixedCols && toCol > fixedCols && toCol !== Infinity) {
        startCol = toCol = grid.colModel.numFixed();
        grid.cellScrollModel.scrollTo(grid.cellScrollModel.row, 0);
      }
      if (isNaN(toRow) || isNaN(toCol)) {
        return; // don't try to select when NaN
      }
      // always pass true because if it was to be cleared mousedown should have handled that
      selectFromFocusToCell(fromRow, fromCol, toRow, toCol, true, wasSelected);
    });
    const unbindDragEnd = grid.eventLoop.bind('grid-drag-end', () => {
      unbindDrag();
      unbindDragEnd();
    });
  };
  grid.eventLoop.bind('grid-drag-start', mainSelection._onDragStart);

  setSelectionToFocus();

  function clearSelectionFromModelChange(e: IRowColEvent) {
    if (e.action === 'size') { // don't clear for resize but all other changes for now will clear selection
      return;
    }
    model.clearSelection();

  }

  grid.eventLoop.bind('grid-col-change', clearSelectionFromModelChange);
  grid.eventLoop.bind('grid-row-change', clearSelectionFromModelChange);
  return model;
}

export default create;