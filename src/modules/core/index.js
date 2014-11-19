var elementClass = require('element-class');
var dirtyClean = require('../dirty-clean');

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

    function createFocusTextArea(container) {
        var textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.left = '-100000px';
        textarea.addEventListener('focus', function () {
            if (container) {
                elementClass(container).add('focus');
            }
        });

        textarea.addEventListener('blur', function () {
            if (container) {
                elementClass(container).remove('focus');
            }
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

        return textarea;
    }

    grid.build = function (container) {
        createFocusTextArea(container);
        grid.viewPort.sizeToContainer(container);
        grid.viewLayer.build(container);
        grid.eventLoop.setContainer(container);
    };

    grid.makeDirtyClean = function () {
        return dirtyClean(grid);
    };

    return grid;
};