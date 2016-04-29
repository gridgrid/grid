var elementClass = require('element-class');
var dirtyClean = require('../dirty-clean');
var util = require('../util');
var rangeUtil = require('../range-util');
var passThrough = require('../pass-through');
var capitalize = require('capitalize');
var escapeStack = require('escape-stack');

module.exports = function (opts) {
    function GridMarker() {

    }
    var grid = new GridMarker();
    grid.opts = opts || {};
    var userSuppliedEscapeStack;
    Object.defineProperty(grid, 'escapeStack', {
        get: function () {
            return userSuppliedEscapeStack || escapeStack(true);
        },
        set: function (v) {
            userSuppliedEscapeStack = {
                // support old method for now
                add: v.addEscapeHandler || v.add
            };
        }
    });

    // the order here matters because some of these depend on each other
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

    addUtilsToCore(); // this has to happen here for things not to break, view layer will add cell classes and that cache requires the utils


    grid.viewLayer = require('../view-layer')(grid);

    // things with logic that also register decorators (slightly less core than the other models)
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

    var drawRequested = false;
    grid.requestDraw = function () {
        if (!grid.eventLoop.isRunning) {
            grid.viewLayer.draw();
        } else {
            drawRequested = true;
        }
    };

    grid.eventLoop.bind('grid-draw', function () {
        drawRequested = false;
    });

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
            textarea.style.zIndex = 1;
            clearTimeout(widthResetTimeout);
            widthResetTimeout = setTimeout(function () {
                textarea.style.zIndex = 0;
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
        textarea.style.zIndex = 0;
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

    function addUtilsToCore() {
        function iterateRange() {
            // expects to be called with the space as its this
            var args = rangeUtil.getArgs(arguments);
            var range = args.range;
            var rowFn = args.rowFn;
            var cellFn = args.cellFn;
            var rowResult;
            rowloop: for (var r = range.top; r < range.top + range.height; r = this.row.next(r)) {
                rowResult = undefined;
                if (rowFn) {
                    rowResult = rowFn(r);
                }
                colloop: for (var c = range.left; c < range.left + range.width; c = this.col.next(c)) {
                    if (cellFn) {
                        var result = cellFn(r, c, rowResult);
                        if (result === false) {
                            break rowloop;
                        } else if (result === true) {
                            break colloop;
                        }
                    }
                }
            }
        }

        function iterateWhileHidden(step, start) {
            step = step || 1;
            for (var i = start + step; i < this.count() && i >= 0; i += step) {
                if (!this.get(i).hidden) {
                    return i;
                }
            }
        }

        function addToDimension(dim, spaceName, getter) {
            //convert whatever space to virtual and use the row or col virtual getter
            dim.get = function (idx) {
                return getter(this.toVirtual(idx));
            }.bind(dim);
            dim.next = iterateWhileHidden.bind(dim, 1);
            dim.prev = iterateWhileHidden.bind(dim, -1);
            dim.clamp = function (idx) {
                return util.clamp(idx, 0, this.count() - 1);
            }.bind(dim);
            dim.indexes = function () {
                var opts;
                opts = arguments[0];
                opts = opts || {};
                opts.from = opts.from || 0;
                var count = this.count();
                opts.to = opts.to + 1 || (opts.length && opts.length + opts.from) || count;
                var indexes = [];
                for (var idx = Math.max(opts.from, 0); idx < Math.min(opts.to, count); idx = opts.reverse ? this.prev(idx) : this.next(idx)) {
                    indexes.push(idx);
                }
                return indexes;
            };

            dim.iterate = function () {
                var opts;
                var fn;
                if (arguments.length === 2) {
                    opts = arguments[0];
                    fn = arguments[1];
                } else {
                    fn = arguments[0];
                }
                dim.indexes(opts).some(function (idx) {
                    return fn(idx);
                });
            };

            // have data to data be passthrough for example
            dim['to' + capitalize(spaceName)] = passThrough;

            return dim;
        }

        function addToSpace(spaceName) {
            var space = grid[spaceName];
            space.iterate = iterateRange.bind(space);
            addToDimension(space.col, spaceName, function (idx) {
                return grid.colModel.get(idx);
            });
            addToDimension(space.row, spaceName, function (idx) {
                return grid.rowModel.get(idx);
            });
            space.up = space.row.prev;
            space.down = space.row.next;
            space.left = space.col.prev;
            space.right = space.col.next;
        }


        grid.data = {
            col: {
                toVirtual: function (dataCol) {
                    return grid.colModel.toVirtual(dataCol);
                },
                toView: function (dataCol) {
                    return grid.virtual.col.toView(this.toVirtual(dataCol));
                },
                count: function () {
                    return grid.colModel.length();
                }
            },
            row: {
                toVirtual: function (dataRow) {
                    return grid.rowModel.toVirtual(dataRow);
                },
                toView: function (dataRow) {
                    return grid.virtual.row.toView(this.toVirtual(dataRow));
                },
                count: function () {
                    return grid.rowModel.length();
                }
            }
        };
        addToSpace('data');

        grid.virtual = {
            col: {
                toData: function (virtualCol) {
                    return grid.colModel.toData(virtualCol);
                },
                toView: function (virtualCol) {
                    return grid.viewPort.toRealCol(virtualCol);
                },
                count: function () {
                    return grid.colModel.length(true);
                }
            },
            row: {
                toData: function (virtualRow) {
                    return grid.rowModel.toData(virtualRow);
                },
                toView: function (virtualRow) {
                    return grid.viewPort.toRealRow(virtualRow);
                },
                count: function () {
                    return grid.rowModel.length(true);
                }
            }
        };
        addToSpace('virtual');

        grid.view = {
            col: {
                toData: function (viewCol) {
                    return grid.virtual.col.toData(this.toVirtual(viewCol));
                },
                toVirtual: function (viewCol) {
                    return grid.viewPort.toVirtualCol(viewCol);
                },
                count: function () {
                    return grid.viewPort.cols;
                }
            },
            row: {
                toData: function (viewRow) {
                    return grid.virtual.row.toData(this.toVirtual(viewRow));
                },
                toVirtual: function (viewRow) {
                    return grid.viewPort.toVirtualRow(viewRow);
                },
                count: function () {
                    return grid.viewPort.rows;
                }
            }
        };
        addToSpace('view');

        timeouts = [];
        grid.timeout = function () {
            if (grid.destroyed) {
                return;
            }
            var id = setTimeout.apply(window, arguments);
            timeouts.push(id);
            return id;
        };
        intervals = [];
        grid.interval = function () {
            if (grid.destroyed) {
                return;
            }
            var id = setInterval.apply(window, arguments);
            intervals.push(id);
            return id;
        };
    }

    var intervals;
    var timeouts;
    grid.eventLoop.bind('grid-destroy', function () {
        intervals.forEach(function (id) {
            clearInterval(id);
        });

        timeouts.forEach(function (id) {
            clearTimeout(id);
        });
    });

    grid.build = function (container) {
        grid.container = container;
        setupTextareaForContainer(grid.textarea, container);
        grid.viewPort.sizeToContainer(container);
        grid.viewLayer.build(container);
        grid.eventLoop.setContainer(container);
        container.style.overflow = 'hidden';
        // the container should never actually scroll, but the browser does automatically sometimes so let's reset it when that happens
        container.addEventListener('scroll', function () {
            container.scrollTop = 0;
            container.scrollLeft = 0;
        });
    };

    grid.makeDirtyClean = function () {
        return dirtyClean(grid);
    };

    grid.eventIsOnCells = grid.viewLayer.eventIsOnCells;

    grid.textarea = createFocusTextArea();

    grid.destroy = function () {
        grid.eventLoop.fire('grid-destroy');
    };

    return grid;
};
