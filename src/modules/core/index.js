var elementClass = require('element-class');
var dirtyClean = require('../dirty-clean');
var util = require('../util');
var rangeUtil = require('../range-util');
var passThrough = require('../pass-through');
var capitalize = require('capitalize');


module.exports = function () {

    var grid = {};

    //the order here matters because some of these depend on each other
    grid.eventLoop = require('../event-loop')(grid);
    grid.decorators = require('../decorators')(grid);
    grid.cellClasses = require('../cell-classes')(grid);
    grid.rowModel = require('../row-model')(grid);
    grid.colModel = require('../col-model')(grid);
    grid.dataModel = require('../simple-data-model')(grid);
    grid.virtualPixelCellModel = require('../virtual-pixel-cell-model')(grid);
    grid.cellScrollModel = require('../cell-scroll-model')(grid);
    grid.cellMouseModel = require('../cell-mouse-model')(grid);

    grid.viewPort = require('../view-port')(grid);
    grid.viewLayer = require('../view-layer')(grid);

    //things with logic that also register decorators (slightly less core than the other models)
    grid.navigationModel = require('../navigation-model')(grid);
    grid.pixelScrollModel = require('../pixel-scroll-model')(grid);
    grid.colResize = require('../col-resize')(grid);
    grid.colReorder = require('../col-reorder')(grid);
    grid.showHiddenCols = require('../show-hidden-cols')(grid);
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
        var textarea = document.createElement('div');
        textarea.setAttribute('dts', 'grid-textarea');
        textarea.setAttribute('contenteditable', 'true');
        util.position(textarea, 0, 0, 0, 0);
        textarea.style.background = 'transparent';
        textarea.style.color = 'transparent';
        textarea.style.border = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.cursor = 'auto';
        textarea.classList.add('grid-textarea');
        textarea.select = function () {
            var range = document.createRange();
            range.selectNodeContents(textarea);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        };

        Object.defineProperty(textarea, 'value', {
            get: function () {
                return textarea.innerText;
            },
            set: function (val) {
                textarea.innerText = val;
            }
        });
        return textarea;
    }

    var spaces = ['virtual', 'data', 'view'];


    function iterateRange() {
        //expects to be called with the space as its this
        var args = rangeUtil.getArgs(arguments);
        var range = args.range;
        var rowFn = args.rowFn;
        var cellFn = args.cellFn;
        var rowResult;
        for (var r = range.top; r < range.top + range.height; r = this.row.next(r)) {
            rowResult = undefined;
            if (rowFn) {
                rowResult = rowFn(r);
            }
            for (var c = range.left; c < range.left + range.width; c = this.col.next(c)) {
                if (cellFn) {
                    cellFn(r, c, rowResult);
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

        //have data to data be passthrough for example
        dim['to' + capitalize(spaceName)] = passThrough;


        //bind all fns to this so they can be accidentally changed
        Object.keys(dim, function (key) {
            var fn = dim[key];
            if (typeof fn === 'function') {
                fn.bind(dim);
            }
        })
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
    }


    grid.data = {
        col: {
            toVirtual: function (dataCol) {
                return grid.colModel.toVirtual(dataCol);
            },
            toView: function (dataCol) {
                return grid.viewPort.toRealCol(this.toVirtual(dataCol));
            },
            count: function () {
                return grid.colModel.length();
            }
        },
        row: {
            toData: passThrough,
            toVirtual: function (dataRow) {
                return grid.rowModel.toVirtual(dataRow);
            },
            toView: function (dataRow) {
                return grid.viewPort.toRealRow(this.toVirtual(dataRow));
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
                return grid.colModel.toData(this.toVirtual(viewCol));
            },
            toVirtual: function (viewCol) {
                return grid.viewPort.toVirtualCol(viewCol);
            },
            count: function () {
                return grid.viewPort.cols();
            }
        },
        row: {
            toData: function (viewRow) {
                return grid.rowModel.toData(this.toVirtual(viewRow));
            },
            toVirtual: function (viewRow) {
                return grid.viewPort.toVirtualRow(viewRow);
            },
            count: function () {
                return grid.viewPort.rows();
            }
        }
    };
    addToSpace('view');

    grid.build = function (container) {
        setupTextareaForContainer(grid.textarea, container);
        grid.viewPort.sizeToContainer(container);
        grid.viewLayer.build(container);
        grid.eventLoop.setContainer(container);
    };

    grid.makeDirtyClean = function () {
        return dirtyClean(grid);
    };

    grid.textarea = createFocusTextArea();

    return grid;
};