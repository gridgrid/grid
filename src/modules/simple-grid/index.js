var util = require('@grid/util');

module.exports = function (numRows, numCols, varyHeights, varyWidths, fixedRows, fixedCols, preSetupFn, headerRows, headerCols) {

    var grid = require('@grid/core')();

    if (preSetupFn) {
        preSetupFn(grid);
    }

    headerRows = headerRows || 0;
    headerCols = headerCols || 0;

    if (numRows) {
        var rows = [];
        var cols = [];
        for (var r = 0; r < numRows + headerRows; r++) {
            var row = grid.rowModel.create();
            row.dataRow = r;
            if (r < headerRows) {
                row.header = true;
            }
            else if (r < fixedRows + headerRows) { //returns false for undefined luckily
                row.fixed = true;
            }
            if (util.isArray(varyHeights)) {
                row.height = varyHeights[r % varyHeights.length];
            }
            rows.push(row);
            if (numCols) {
                for (var c = 0; c < numCols + headerCols || 0; c++) {
                    if (r === 0) {
                        var col = grid.colModel.create();
                        col.dataCol = c;
                        if (c < headerCols) {
                            col.header = true;
                        } else if (c < fixedCols + headerCols) {
                            col.fixed = true;
                        }
                        if (varyWidths) {
                            if (util.isArray(varyWidths)) {
                                col.width = varyWidths[c % varyWidths.length];
                            } else {
                                col.width = Math.random() * 10 + 101;
                            }

                        }
                        cols.push(col);
                    }
                    grid.dataModel.set(r, c, {value: [r, c]});
                }
            }
        }
        grid.rowModel.add(rows);
        grid.colModel.add(cols);
    }

    return grid;
};