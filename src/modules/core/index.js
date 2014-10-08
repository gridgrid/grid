var elementClass = require('element-class');

module.exports = function () {

    var grid = {};

    //the order here matters because some of these depend on each other
    grid.eventLoop = require('@grid/event-loop')(grid);
    grid.decorators = require('@grid/decorators')(grid);
    grid.cellClasses = require('@grid/cell-classes')(grid);
    grid.rowModel = require('@grid/row-model')(grid);
    grid.colModel = require('@grid/col-model')(grid);
    grid.dataModel = require('@grid/simple-data-model')(grid);
    grid.virtualPixelCellModel = require('@grid/virtual-pixel-cell-model')(grid);
    grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);
    grid.navigationModel = require('@grid/navigation-model')(grid);

    grid.viewLayer = require('@grid/view-layer')(grid);
    grid.pixelScrollModel = require('@grid/pixel-scroll-model')(grid);


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

    var textarea;
    var container;

    function createFocusTextArea() {
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

        return textarea;
    }

    grid.build = function (_container) {
        container = _container;
        textarea = createFocusTextArea();
        container.appendChild(textarea);
        grid.viewLayer.build(container);
        grid.eventLoop.setContainer(container);

    };

    return grid;
};