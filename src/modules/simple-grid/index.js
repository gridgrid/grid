var util = require('@grid/util');

module.exports = function (numRows, numCols, varyHeights, varyWidths, fixedRows, fixedCols) {

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

    if (numRows) {
        for (var r = 0; r < numRows; r++) {
            var row = {};
            if (r < fixedRows) { //returns false for undefined luckily
                row.fixed = true;
            }
            if (util.isArray(varyHeights)) {
                row.height = varyHeights[r % varyHeights.length];
            }
            grid.rowModel.add(row);
            if (numCols) {
                for (var c = 0; c < numCols || 0; c++) {
                    if (r === 0) {
                        var col = {};
                        if (c < fixedCols) {
                            col.fixed = true;
                        }
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

    return grid;
};