"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("../core");
var simple_data_model_1 = require("../simple-data-model");
function create(numRows, numCols, varyHeights, varyWidths, fixedRows, fixedCols, preSetupFn, headerRows, headerCols, opts) {
    var grid = core_1.default(opts);
    grid.dataModel = simple_data_model_1.default(grid);
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
            var dataRow = r - headerRows;
            row.dataRow = dataRow;
            if (r < headerRows) {
                row.dataRow = r;
                row.header = true;
            }
            else if (fixedRows != undefined && r < fixedRows + headerRows) {
                row.fixed = true;
            }
            if (Array.isArray(varyHeights)) {
                row.height = varyHeights[r % varyHeights.length];
            }
            rows.push(row);
            if (numCols) {
                for (var c = 0; c < numCols + headerCols || 0; c++) {
                    var dataCol = c - headerCols;
                    if (r === 0) {
                        var col = grid.colModel.create();
                        col.dataCol = dataCol;
                        if (c < headerCols) {
                            col.dataCol = c;
                            col.header = true;
                        }
                        else if (fixedCols != undefined && c < fixedCols + headerCols) {
                            col.fixed = true;
                        }
                        if (varyWidths) {
                            col.width = Array.isArray(varyWidths) ?
                                varyWidths[c % varyWidths.length] :
                                Math.random() * 10 + 101;
                        }
                        cols.push(col);
                    }
                    if (c < headerCols || r < headerRows) {
                        grid.dataModel.setHeader(r, c, [r + '', c + '']);
                    }
                    else {
                        grid.dataModel.set(dataRow, dataCol, [dataRow, dataCol]);
                    }
                }
            }
        }
        grid.rowModel.add(rows);
        grid.colModel.add(cols);
    }
    return grid;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map