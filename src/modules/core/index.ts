require('es6-object-assign').polyfill();

import { IAbstractRowColModel, IColDescriptor, IRowDescriptor } from '@grid/abstract-row-col-model';
import creatCellClasses, { ICellClasses } from '@grid/cell-classes';
import createCellKeyboardModel, { ICellKeyboardModel } from '@grid/cell-keyboard-model';
import cellMouseModel, { ICellMouseModel, IEventDimensionInfoGetter } from '@grid/cell-mouse-model';
import createCellScrollModel, { ICellScrollModel } from '@grid/cell-scroll-model';
import createColModel, { ColModel } from '@grid/col-model';
import createColReorder, { IColReorder } from '@grid/col-reorder';
import createColResize, { IColResize } from '@grid/col-resize';
import createCopyPaste, { ICopyPaste } from '@grid/copy-paste';
import createDecorators, { IDecoratorModel } from '@grid/decorators';
import makeDirtyClean from '@grid/dirty-clean';
import createEventLoop, { EventLoop } from '@grid/event-loop';
import createFps, { IFps } from '@grid/fps';
import createPixelScrollModel, { IPixelScrollDimensionInfo, IPixelScrollModel } from '@grid/pixel-scroll-model';
import { colPositionRangeDimension, IPositionRangeDimension, rowPositionRangeDimension } from '@grid/position-range';
import createRowModel, { RowModel } from '@grid/row-model';
import { AbstractSpaceConverter } from '@grid/space/converter';
import { DataSpaceConverter } from '@grid/space/data-space-converter';
import { AbstractDimensionalSpaceConverter } from '@grid/space/dimensional-converter';
import { ViewSpaceConverter } from '@grid/space/view-space-converter';
import { VirtualSpaceConverter } from '@grid/space/virtual-space-converter';
import createViewPort, { IViewPort, IViewPortDimensionInfo } from '@grid/view-port';
import createVirtualPixelCellModel, { IVirtualPixelCellDimensionInfo, IVirtualPixelCellModel } from '@grid/virtual-pixel-cell-model';

const escapeStack = require('escape-stack');
const elementClass = require('element-class');
const util = require('@grid/util');

export interface IGridOpts {
    snapToCell?: boolean;
    allowEdit?: boolean;
    col?: {
        disableReorder?: boolean;
    };
}

export type EscapeStackHandler = () => boolean | undefined;
export type EscapeStackRemover = () => void;

export interface IEscapeStack {
    add: (handler: EscapeStackHandler) => EscapeStackRemover;
}

export interface IGridDataResult<T> {
    value: T;
    formatted: string;
}

export interface IGridDataChange<T> extends IGridDataResult<T> {
    row: number;
    col: number;
    paste?: boolean;
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
    timeout: typeof setTimeout;
    interval: typeof setInterval;
    requestDraw: () => void;
    build: (container: HTMLElement) => void;
    makeDirtyClean: () => any;
    destroy: () => void;
    eventIsOnCells: (e: UIEvent) => boolean;
    rows: IGridDimension;
    cols: IGridDimension;
}

export interface IGridModels {
    eventLoop: EventLoop;
    decorators: IDecoratorModel;
    cellClasses: ICellClasses;
    rowModel: RowModel;
    colModel: ColModel;
    dataModel: any;
    virtualPixelCellModel: IVirtualPixelCellModel;
    cellScrollModel: ICellScrollModel;
    cellMouseModel: ICellMouseModel;
    cellKeyboardModel: ICellKeyboardModel;
    fps: IFps;
    viewPort: IViewPort;
    viewLayer: any;
    colReorder: IColReorder;
    editModel: any;
    navigationModel: any;
    pixelScrollModel: IPixelScrollModel;
    showHiddenCols: any;
    colResize: IColResize;
    copyPaste: ICopyPaste;
}

export type Grid = IGridCore & IGridModels;

export function create(opts: IGridOpts = {}) {
    const lazyGetterMap: { [key: string]: any } = {};

    const lazyGetter = <T>(idx: string, getFn: () => T) => {
        if (lazyGetterMap[idx] === undefined) {
            lazyGetterMap[idx] = getFn();
        }
        return lazyGetterMap[idx] as T;
    };
    let userSuppliedEscapeStack: IEscapeStack;
    let drawRequested = false;
    const timeouts: number[] = [];
    const intervals: number[] = [];
    const gridCore: IGridCore = {
        opts,
        focused: false,
        destroyed: false,
        textarea: createFocusTextArea(),
        get escapeStack(): IEscapeStack {
            return userSuppliedEscapeStack || escapeStack(true);
        },
        set escapeStack(v: IEscapeStack) {
            userSuppliedEscapeStack = v;
        },
        requestDraw: () => {
            if (!grid.viewLayer || !grid.viewLayer.draw) {
                return;
            }
            if (!grid.eventLoop.isRunning) {
                grid.viewLayer.draw();
            } else {
                drawRequested = true;
            }
        },
        get data() {
            return lazyGetter('data', () => new DataSpaceConverter(grid));
        },
        get view() {
            return lazyGetter('view', () => new ViewSpaceConverter(grid));
        },
        get virtual() {
            return lazyGetter('virtual', () => new VirtualSpaceConverter(grid));
        },
        timeout() {
            if (grid.destroyed) {
                return;
            }
            const id = setTimeout.apply(window, arguments);
            timeouts.push(id);
            return id;
        },
        interval() {
            if (grid.destroyed) {
                return;
            }
            const id = setInterval.apply(window, arguments);
            intervals.push(id);
            return id;
        },
        build(container: HTMLElement) {
            grid.container = container;
            setupTextareaForContainer(grid.textarea, container);
            grid.viewPort.sizeToContainer(container);
            grid.viewLayer.build(container);
            grid.eventLoop.setContainer(container);
            container.style.overflow = 'hidden';
            // the container should never actually scroll, but the browser does automatically sometimes so let's reset it when that happens
            container.addEventListener('scroll', () => {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            });
        },
        makeDirtyClean() {
            return makeDirtyClean(grid);
        },
        eventIsOnCells(e: UIEvent) {
            return grid.viewLayer.eventIsOnCells(e);
        },
        destroy() {
            grid.eventLoop.fire('grid-destroy');
        },
        rows: {
            get rowColModel() {
                return grid.rowModel;
            },
            get viewPort() {
                return grid.viewPort.rowInfo;
            },
            get cellScroll() {
                return grid.cellScrollModel.rowInfo;
            },
            get pixelScroll() {
                return grid.pixelScrollModel.y;
            },
            get positionRange() {
                return rowPositionRangeDimension;
            },
            get cellMouse() {
                return grid.cellMouseModel.rowInfo;
            },
            get virtualPixelCell() {
                return grid.virtualPixelCellModel.rows;
            },
            converters: {
                get virtual() {
                    return gridCore.virtual.row;
                },
                get view() {
                    return gridCore.view.row;
                },
                get data() {
                    return gridCore.data.row;
                },
            }
        },
        cols: {
            get rowColModel() {
                return grid.colModel;
            },
            get viewPort() {
                return grid.viewPort.colInfo;
            },
            get cellScroll() {
                return grid.cellScrollModel.colInfo;
            },
            get pixelScroll() {
                return grid.pixelScrollModel.x;
            },
            get positionRange() {
                return colPositionRangeDimension;
            },
            get cellMouse() {
                return grid.cellMouseModel.colInfo;
            },
            get virtualPixelCell() {
                return grid.virtualPixelCellModel.cols;
            },
            converters: {
                get virtual() {
                    return gridCore.virtual.col;
                },
                get view() {
                    return gridCore.view.col;
                },
                get data() {
                    return gridCore.data.col;
                },
            }
        }
    };

    const grid: Grid = gridCore as any;

    grid.eventLoop = createEventLoop();
    grid.decorators = createDecorators(grid);
    grid.cellClasses = creatCellClasses(grid);
    grid.rowModel = createRowModel(grid);
    grid.colModel = createColModel(grid);
    grid.dataModel = require('../simple-data-model')(grid);
    grid.virtualPixelCellModel = createVirtualPixelCellModel(grid);
    grid.cellScrollModel = createCellScrollModel(grid);
    grid.cellMouseModel = cellMouseModel(grid);
    grid.cellKeyboardModel = createCellKeyboardModel(grid);
    grid.fps = createFps(grid);
    grid.viewPort = createViewPort(grid);
    grid.viewLayer = require('../view-layer')(grid);

    if (!(opts.col && opts.col.disableReorder)) {
        grid.colReorder = createColReorder(grid);
    }

    if (opts.allowEdit) {
        grid.editModel = require('../edit-model')(grid);
    }

    grid.navigationModel = require('../navigation-model')(grid);

    grid.pixelScrollModel = createPixelScrollModel(grid);
    grid.showHiddenCols = require('../show-hidden-cols')(grid);
    grid.colResize = createColResize(grid);
    grid.copyPaste = createCopyPaste(grid);

    // the order here matters because some of these depend on each other

    // things with logic that also register decorators (slightly less core than the other models)

    grid.eventLoop.addExitListener(() => {
        if (drawRequested) {
            grid.viewLayer.draw();
        }
    });

    function setupTextareaForContainer(textarea: HTMLTextAreaElement, container: HTMLElement) {
        textarea.addEventListener('focus', () => {
            if (container) {
                elementClass(container).add('focus');
            }
            textarea.select();
            grid.focused = true;
            grid.eventLoop.fire('grid-focus');
        });

        textarea.addEventListener('blur', () => {
            if (container) {
                elementClass(container).remove('focus');
            }
            grid.focused = false;
            grid.eventLoop.fire('grid-blur');
        });

        let widthResetTimeout: number | undefined;
        // TODO: type the interceptor properly
        grid.eventLoop.addInterceptor((e: MouseEvent) => {
            if (e.type !== 'mousedown' || e.button !== 2) {
                return;
            }
            textarea.style.width = '100%';
            textarea.style.height = '100%';
            textarea.style.zIndex = '1';
            if (widthResetTimeout) {
                clearTimeout(widthResetTimeout);
            }
            widthResetTimeout = setTimeout(() => {
                textarea.style.zIndex = '0';
                textarea.style.width = '0px';
                textarea.style.height = '1px';
            }, 1);
        });

        container.appendChild(textarea);
        if (!container.getAttribute('tabIndex')) {
            container.tabIndex = -1;
        }
        container.addEventListener('focus', () => {
            if (textarea) {
                textarea.focus();
            }
        });
    }

    function createFocusTextArea() {
        const textarea = document.createElement('textarea');
        textarea.setAttribute('dts', 'grid-textarea');
        util.position(textarea, 0, 0);
        textarea.style.width = '0px';
        textarea.style.height = '1px';
        textarea.style.maxWidth = '100%';
        textarea.style.maxHeight = '100%';
        textarea.style.zIndex = '0';
        textarea.style.overflow = 'hidden';

        textarea.style.background = 'transparent';
        textarea.style.color = 'transparent';
        textarea.style.border = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.cursor = 'default';
        textarea.classList.add('grid-textarea');
        textarea.setAttribute('ondragstart', 'return false;');

        return textarea;
    }

    grid.eventLoop.bind('grid-destroy', () => {
        intervals.forEach((id) => {
            clearInterval(id);
        });

        timeouts.forEach((id) => {
            clearTimeout(id);
        });
    });

    return grid;
}

export default create;