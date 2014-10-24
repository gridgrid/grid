var util = require('@grid/util');

module.exports = function (numRows, numCols, varyHeights, varyWidths, fixedRows, fixedCols, preSetupFn) {

    var grid = require('@grid/core')();

    if (preSetupFn) {
        preSetupFn(grid);
    }

    if (numRows) {
        for (var r = 0; r < numRows; r++) {
            var row = grid.rowModel.create();
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
                        var col = grid.colModel.create();
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