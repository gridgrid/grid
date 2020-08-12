import { ICellClassDescriptor } from '../cell-classes';
import { Grid } from '../core';
import { IDecorator } from '../decorators';
import { AnnotatedMouseOrKeyEventUnion, IGridDragStartEvent } from '../event-loop';
import { RawPositionRange } from '../position-range';
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
export declare function create(grid: Grid): INavigationModel;
export default create;
