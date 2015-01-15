var elementClass = require('element-class');
var dirtyClean = require('../dirty-clean');
var util = require('../util');


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