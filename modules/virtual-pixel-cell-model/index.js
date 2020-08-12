"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("../util");
function makeDimension(gridDimension) {
    var dimension = {
        toCellFromPx: function (px) {
            if (px < 0) {
                return NaN;
            }
            var sumLength = 0;
            for (var r = 0; r < gridDimension.rowColModel.length(true); r++) {
                sumLength += gridDimension.rowColModel.sizeOf(r);
                if (px < sumLength) {
                    return r;
                }
            }
            return NaN;
        },
        clampCell: function (cell) {
            var maxRowCol = gridDimension.rowColModel.length(true) - 1;
            return util.clamp(cell, 0, maxRowCol);
        },
        sizeOf: function (start, end) {
            var length = 0;
            if (end != undefined && end < start) {
                return 0;
            }
            end = util.isNumber(end) ? end : start;
            end = dimension.clampCell(end);
            start = dimension.clampCell(start);
            for (var i = start; i <= end; i++) {
                length += gridDimension.rowColModel.sizeOf(i);
            }
            return length;
        },
        totalSize: function () {
            return dimension.sizeOf(0, gridDimension.rowColModel.length(true) - 1);
        },
        fixedSize: function () {
            return dimension.sizeOf(0, gridDimension.rowColModel.numFixed() - 1);
        },
    };
    return dimension;
}
function create(grid) {
    var dimensions = {
        rows: makeDimension(grid.rows),
        cols: makeDimension(grid.cols),
    };
    var virtualPixelCellModel = {
        getRow: dimensions.rows.toCellFromPx,
        getCol: dimensions.cols.toCellFromPx,
        clampRow: dimensions.rows.clampCell,
        clampCol: dimensions.cols.clampCell,
        height: dimensions.rows.sizeOf,
        width: dimensions.cols.sizeOf,
        totalHeight: dimensions.rows.totalSize,
        totalWidth: dimensions.cols.totalSize,
        fixedHeight: dimensions.rows.fixedSize,
        fixedWidth: dimensions.cols.fixedSize,
        rows: dimensions.rows,
        cols: dimensions.cols,
    };
    function sizeChangeListener() {
        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
    }
    grid.eventLoop.bind('grid-col-change', sizeChangeListener);
    grid.eventLoop.bind('grid-row-change', sizeChangeListener);
    return virtualPixelCellModel;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map