import { IAbstractRowColModel, IColDescriptor, IRowDescriptor } from '../abstract-row-col-model';
import { ICellClasses } from '../cell-classes';
import { ICellKeyboardModel } from '../cell-keyboard-model';
import { ICellMouseModel, IEventDimensionInfoGetter } from '../cell-mouse-model';
import { ICellScrollModel } from '../cell-scroll-model';
import { ColModel } from '../col-model';
import { IColReorder } from '../col-reorder';
import { IColResize } from '../col-resize';
import { ICopyPaste } from '../copy-paste';
import { IDataModel } from '../data-model';
import { RowLoader } from '../data-model';
import { IDecoratorModel } from '../decorators';
import { IEditModel } from '../edit-model';
import { EventLoop, EventUnion } from '../event-loop';
import { IFps } from '../fps';
import { INavigationModel } from '../navigation-model';
import { IPixelScrollDimensionInfo, IPixelScrollModel } from '../pixel-scroll-model';
import { IPositionRangeDimension } from '../position-range';
import { RowModel } from '../row-model';
import { IShowHiddenCols } from '../show-hidden-cols';
import { AbstractSpaceConverter } from '../space/converter';
import { AbstractDimensionalSpaceConverter } from '../space/dimensional-converter';
import { IViewLayer } from '../view-layer';
import { IViewPort, IViewPortDimensionInfo } from '../view-port';
import { IVirtualPixelCellDimensionInfo, IVirtualPixelCellModel } from '../virtual-pixel-cell-model';
export interface IGridOpts {
    snapToCell?: boolean;
    allowEdit?: boolean;
    loadRows?: RowLoader;
    col?: {
        disableReorder?: boolean;
        disableResize?: boolean;
    };
}
export declare type EscapeStackHandler = () => boolean | void;
export declare type EscapeStackRemover = () => void;
export interface IEscapeStack {
    add: (handler: EscapeStackHandler) => EscapeStackRemover;
}
export interface IGridDimension {
    rowColModel: IAbstractRowColModel;
    viewPort: IViewPortDimensionInfo;
    pixelScroll: IPixelScrollDimensionInfo;
    cellScroll: ICellScrollDimensionInfo;
    positionRange: IPositionRangeDimension;
    cellMouse: IEventDimensionInfoGetter;
    virtualPixelCell: IVirtualPixelCellDimensionInfo;
    converters: {
        virtual: AbstractDimensionalSpaceConverter<IRowDescriptor | IColDescriptor>;
        view: AbstractDimensionalSpaceConverter<IRowDescriptor | IColDescriptor>;
        data: AbstractDimensionalSpaceConverter<IRowDescriptor | IColDescriptor>;
    };
}
export interface ICellScrollDimensionInfo {
    position: number;
}
export interface IGridCore {
    opts: IGridOpts;
    escapeStack: IEscapeStack;
    focused: boolean;
    destroyed: boolean;
    container?: HTMLElement;
    textarea: HTMLTextAreaElement;
    data: AbstractSpaceConverter;
    virtual: AbstractSpaceConverter;
    view: AbstractSpaceConverter;
    timeout: (...args: Parameters<typeof window.setTimeout>) => number | undefined;
    interval: (...args: Parameters<typeof window.setInterval>) => number | undefined;
    requestDraw: () => void;
    build: (container: HTMLElement) => void;
    makeDirtyClean: () => any;
    destroy: () => void;
    eventIsOnCells: (e: EventUnion) => boolean;
    rows: IGridDimension;
    cols: IGridDimension;
}
export interface IGridModels {
    eventLoop: EventLoop;
    decorators: IDecoratorModel;
    cellClasses: ICellClasses;
    rowModel: RowModel;
    colModel: ColModel;
    dataModel: IDataModel;
    virtualPixelCellModel: IVirtualPixelCellModel;
    cellScrollModel: ICellScrollModel;
    cellMouseModel: ICellMouseModel;
    cellKeyboardModel: ICellKeyboardModel;
    fps: IFps;
    viewPort: IViewPort;
    viewLayer: IViewLayer;
    colReorder: IColReorder;
    editModel: IEditModel;
    navigationModel: INavigationModel;
    pixelScrollModel: IPixelScrollModel;
    showHiddenCols: IShowHiddenCols;
    colResize: IColResize;
    copyPaste: ICopyPaste;
}
export declare type Grid = IGridCore & IGridModels;
export declare function create(opts?: IGridOpts): Grid;
export default create;
export * from '../abstract-row-col-model';
export * from '../cell-classes';
export * from '../cell-keyboard-model';
export * from '../cell-mouse-model';
export * from '../cell-scroll-model';
export * from '../col-model';
export * from '../col-reorder';
export * from '../col-resize';
export * from '../copy-paste';
export * from '../data-model';
export * from '../data-model';
export * from '../decorators';
export * from '../dirty-clean';
export * from '../edit-model';
export * from '../event-loop';
export * from '../fps';
export * from '../navigation-model';
export * from '../pixel-scroll-model';
export * from '../position-range';
export * from '../row-model';
export * from '../show-hidden-cols';
export * from '../space/converter';
export * from '../space/data-space-converter';
export * from '../space/dimensional-converter';
export * from '../space/view-space-converter';
export * from '../space/virtual-space-converter';
export * from '../util';
export * from '../view-layer';
export * from '../view-port';
export * from '../virtual-pixel-cell-model';
