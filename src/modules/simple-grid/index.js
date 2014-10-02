var util = require('@grid/util');

module.exports = function (numRows, numCols, varyWidths) {

    var grid = {};

    //the order here matters because some of these depend on each other
    grid.eventLoop = require('@grid/event-loop')(grid);
    grid.decorators = require('@grid/decorators')(grid);
    grid.rowModel = require('@grid/row-model')(grid);
    grid.colModel = require('@grid/col-model')(grid);
    grid.dataModel = require('@grid/simple-data-model')(grid);
    grid.virtualPixelCellModel = require('@grid/virtual-pixel-cell-model')(grid);
    grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);


    grid.viewLayer = require('@grid/view-layer')(grid);
    grid.pixelScrollModel = require('@grid/pixel-scroll-model')(grid);


    if (numRows) {
        for (var r = 0; r < numRows; r++) {
            var row = {};
            grid.rowModel.add(row);
            if (numCols) {
                for (var c = 0; c < numCols || 0; c++) {
                    if (r === 0) {
                        var col = {};
                        if (varyWidths) {
                            if (util.isArray(varyWidths)) {
                                col.width = varyWidths[c % varyWidths.length];
                            } else {
                                col.width = Math.random() * 10 + 101;
                            }

                        }
                        grid.colModel.add(col);
                    }
                    grid.dataModel.set(r, c, {value: r + '-' + c});
                }
            }
        }
    }

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

    return grid;
};