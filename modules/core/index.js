"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
require('es6-object-assign').polyfill();
var cell_classes_1 = require("../cell-classes");
var cell_keyboard_model_1 = require("../cell-keyboard-model");
var cell_mouse_model_1 = require("../cell-mouse-model");
var cell_scroll_model_1 = require("../cell-scroll-model");
var col_model_1 = require("../col-model");
var col_reorder_1 = require("../col-reorder");
var col_resize_1 = require("../col-resize");
var copy_paste_1 = require("../copy-paste");
var data_model_1 = require("../data-model");
var decorators_1 = require("../decorators");
var dirty_clean_1 = require("../dirty-clean");
var edit_model_1 = require("../edit-model");
var event_loop_1 = require("../event-loop");
var fps_1 = require("../fps");
var navigation_model_1 = require("../navigation-model");
var pixel_scroll_model_1 = require("../pixel-scroll-model");
var position_range_1 = require("../position-range");
var row_model_1 = require("../row-model");
var show_hidden_cols_1 = require("../show-hidden-cols");
var data_space_converter_1 = require("../space/data-space-converter");
var view_space_converter_1 = require("../space/view-space-converter");
var virtual_space_converter_1 = require("../space/virtual-space-converter");
var util = require("../util");
var view_layer_1 = require("../view-layer");
var view_port_1 = require("../view-port");
var virtual_pixel_cell_model_1 = require("../virtual-pixel-cell-model");
var escapeStack = require('escape-stack');
var elementClass = require('element-class');
function create(opts) {
    if (opts === void 0) { opts = {}; }
    var lazyGetterMap = {};
    var lazyGetter = function (idx, getFn) {
        if (lazyGetterMap[idx] === undefined) {
            lazyGetterMap[idx] = getFn();
        }
        return lazyGetterMap[idx];
    };
    var userSuppliedEscapeStack;
    var drawRequested = false;
    var timeouts = [];
    var intervals = [];
    var gridCore = {
        opts: opts,
        focused: false,
        destroyed: false,
        textarea: createFocusTextArea(),
        get escapeStack() {
            return userSuppliedEscapeStack || escapeStack(true);
        },
        set escapeStack(v) {
            userSuppliedEscapeStack = v;
        },
        requestDraw: function () {
            if (!grid.viewLayer || !grid.viewLayer.draw) {
                return;
            }
            if (!grid.eventLoop.isRunning) {
                grid.viewLayer.draw();
            }
            else {
                drawRequested = true;
            }
        },
        get data() {
            return lazyGetter('data', function () { return new data_space_converter_1.DataSpaceConverter(grid); });
        },
        get view() {
            return lazyGetter('view', function () { return new view_space_converter_1.ViewSpaceConverter(grid); });
        },
        get virtual() {
            return lazyGetter('virtual', function () { return new virtual_space_converter_1.VirtualSpaceConverter(grid); });
        },
        timeout: function () {
            if (grid.destroyed) {
                return undefined;
            }
            var id = window.setTimeout.apply(window, arguments);
            timeouts.push(id);
            return id;
        },
        interval: function () {
            if (grid.destroyed) {
                return undefined;
            }
            var id = window.setInterval.apply(window, arguments);
            intervals.push(id);
            return id;
        },
        build: function (container) {
            grid.container = container;
            setupTextareaForContainer(grid.textarea, container);
            grid.viewPort.sizeToContainer(container);
            grid.viewLayer.build(container);
            grid.eventLoop.setContainer(container);
            container.style.overflow = 'hidden';
            container.addEventListener('scroll', function () {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            });
        },
        makeDirtyClean: function () {
            return dirty_clean_1.default(grid);
        },
        eventIsOnCells: function (e) {
            return grid.viewLayer.eventIsOnCells(e);
        },
        destroy: function () {
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
                return position_range_1.rowPositionRangeDimension;
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
                return position_range_1.colPositionRangeDimension;
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
    var grid = gridCore;
    grid.eventLoop = event_loop_1.default();
    grid.decorators = decorators_1.default(grid);
    grid.cellClasses = cell_classes_1.default(grid);
    grid.rowModel = row_model_1.default(grid);
    grid.colModel = col_model_1.default(grid);
    grid.dataModel = data_model_1.default(grid, opts.loadRows);
    grid.virtualPixelCellModel = virtual_pixel_cell_model_1.default(grid);
    grid.cellScrollModel = cell_scroll_model_1.default(grid);
    grid.cellMouseModel = cell_mouse_model_1.default(grid);
    grid.cellKeyboardModel = cell_keyboard_model_1.default(grid);
    grid.fps = fps_1.default(grid);
    grid.viewPort = view_port_1.default(grid);
    grid.viewLayer = view_layer_1.default(grid);
    if (!(opts.col && opts.col.disableReorder)) {
        grid.colReorder = col_reorder_1.default(grid);
    }
    if (opts.allowEdit) {
        grid.editModel = edit_model_1.default(grid);
    }
    grid.navigationModel = navigation_model_1.default(grid);
    grid.pixelScrollModel = pixel_scroll_model_1.default(grid);
    grid.showHiddenCols = show_hidden_cols_1.default(grid);
    if (!(opts.col && opts.col.disableResize)) {
        grid.colResize = col_resize_1.default(grid);
    }
    grid.copyPaste = copy_paste_1.default(grid);
    grid.eventLoop.addExitListener(function () {
        if (drawRequested) {
            grid.viewLayer.draw();
        }
    });
    function setupTextareaForContainer(textarea, container) {
        textarea.addEventListener('focus', function () {
            if (container) {
                elementClass(container).add('focus');
            }
            textarea.select();
            grid.focused = true;
            grid.eventLoop.fire('grid-focus');
        });
        textarea.addEventListener('blur', function () {
            if (container) {
                elementClass(container).remove('focus');
            }
            grid.focused = false;
            grid.eventLoop.fire('grid-blur');
        });
        var widthResetTimeout;
        grid.eventLoop.addInterceptor(function (e) {
            if (e.type !== 'mousedown' || e.button !== 2) {
                return;
            }
            textarea.style.width = '100%';
            textarea.style.height = '100%';
            textarea.style.zIndex = '1';
            if (widthResetTimeout) {
                clearTimeout(widthResetTimeout);
            }
            widthResetTimeout = window.setTimeout(function () {
                textarea.style.zIndex = '0';
                textarea.style.width = '0px';
                textarea.style.height = '1px';
            }, 1);
        });
        container.appendChild(textarea);
        if (!container.getAttribute('tabIndex')) {
            container.tabIndex = -1;
        }
        container.addEventListener('focus', function () {
            if (textarea) {
                textarea.focus();
            }
        });
    }
    function createFocusTextArea() {
        var textarea = document.createElement('textarea');
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
        textarea.style.resize = 'none';
        textarea.style.cursor = 'default';
        textarea.classList.add('grid-textarea');
        textarea.setAttribute('ondragstart', 'return false;');
        return textarea;
    }
    grid.eventLoop.bind('grid-destroy', function () {
        intervals.forEach(function (id) {
            clearInterval(id);
        });
        timeouts.forEach(function (id) {
            clearTimeout(id);
        });
    });
    return grid;
}
exports.create = create;
exports.default = create;
__export(require("../abstract-row-col-model"));
__export(require("../cell-classes"));
__export(require("../cell-keyboard-model"));
__export(require("../cell-mouse-model"));
__export(require("../cell-scroll-model"));
__export(require("../col-model"));
__export(require("../col-reorder"));
__export(require("../col-resize"));
__export(require("../copy-paste"));
__export(require("../data-model"));
__export(require("../data-model"));
__export(require("../decorators"));
__export(require("../dirty-clean"));
__export(require("../edit-model"));
__export(require("../event-loop"));
__export(require("../fps"));
__export(require("../navigation-model"));
__export(require("../pixel-scroll-model"));
__export(require("../position-range"));
__export(require("../row-model"));
__export(require("../show-hidden-cols"));
__export(require("../space/converter"));
__export(require("../space/data-space-converter"));
__export(require("../space/dimensional-converter"));
__export(require("../space/view-space-converter"));
__export(require("../space/virtual-space-converter"));
__export(require("../util"));
__export(require("../view-layer"));
__export(require("../view-port"));
__export(require("../virtual-pixel-cell-model"));
//# sourceMappingURL=index.js.map