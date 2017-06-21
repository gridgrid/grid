require('es6-object-assign').polyfill();

const elementClass = require('element-class');
const dirtyClean = require('../dirty-clean');
const util = require('@grid/util');

const escapeStack = require('escape-stack');

import { AbstractSpaceConverter } from '../space/converter';
import { DataSpaceConverter } from '../space/data-space-converter';
import { ViewSpaceConverter } from '../space/view-space-converter';
import { VirtualSpaceConverter } from '../space/virtual-space-converter';

export interface IGridOpts {
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
}

export interface IGridModels {
    eventLoop: any;
    decorators: any;
    cellClasses: any;
    rowModel: any;
    colModel: any;
    dataModel: any;
    virtualPixelCellModel: any;
    cellScrollModel: any;
    cellMouseModel: any;
    cellKeyboardModel: any;
    fps: any;
    viewPort: any;
    viewLayer: any;
    colReorder: any;
    editModel: any;
    navigationModel: any;
    pixelScrollModel: any;
    showHiddenCols: any;
    colResize: any;
    copyPaste: any;
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
            return dirtyClean(grid);
        },
        eventIsOnCells(e: UIEvent) {
            return grid.viewLayer.eventIsOnCells(e);
        },
        destroy() {
            grid.eventLoop.fire('grid-destroy');
        }
    };

    const grid: Grid = gridCore as any;

    grid.eventLoop = require('../event-loop')(grid);
    grid.decorators = require('../decorators')(grid);
    grid.cellClasses = require('../cell-classes')(grid);
    grid.rowModel = require('../row-model')(grid);
    grid.colModel = require('../col-model')(grid);
    grid.dataModel = require('../simple-data-model')(grid);
    grid.virtualPixelCellModel = require('../virtual-pixel-cell-model')(grid);
    grid.cellScrollModel = require('../cell-scroll-model')(grid);
    grid.cellMouseModel = require('../cell-mouse-model')(grid);
    grid.cellKeyboardModel = require('../cell-keyboard-model')(grid);
    grid.fps = require('../fps')(grid);
    grid.viewPort = require('../view-port')(grid);
    grid.viewLayer = require('../view-layer')(grid);

    if (!(opts && opts.col && opts.col.disableReorder)) {
        grid.colReorder = require('../col-reorder')(grid);
    }

    if (opts && opts.allowEdit) {
        grid.editModel = require('../edit-model')(grid);
    }

    grid.navigationModel = require('../navigation-model')(grid);

    grid.pixelScrollModel = require('../pixel-scroll-model')(grid);
    grid.showHiddenCols = require('../show-hidden-cols')(grid);
    grid.colResize = require('../col-resize')(grid);
    grid.copyPaste = require('../copy-paste')(grid);

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
