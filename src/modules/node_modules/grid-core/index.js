module.exports = function (container) {
    $container = $(container);

    function abstractEachCell(cellFn, rowFn, onScreen) {
        var rows = onScreen && grid.onScreenRows || grid.maxRows;
        var cols = onScreen && grid.onScreenCols || grid.maxCols;
        for (var r = 0; r < rows; r++) {
            if (rowFn) {
                rowFn(r);
            }
            for (var c = 0; c < cols; c++) {
                cellFn(r, c);
            }
        }
    }


    function getOffset(scroll, length) {
        return Math.floor(scroll / length);
    }

    var grid = {
        cellHeight: 30,
        cellWidth: 100,
        maxRows: 10000,
        maxCols: 10000,
        setDimensions: function (r, c) {
            grid.maxRows = r;
            grid.maxCols = c;
        },
        calc: function () {
            grid.onScreenRows = Math.floor($container.height() / grid.cellHeight);
            grid.onScreenCols = Math.floor($container.width() / grid.cellWidth);
            grid.rowPixelRange = Number.range(0, grid.maxRows * grid.cellHeight);
            grid.colPixelRange = Number.range(0, grid.maxCols * grid.cellWidth);
        },
        eachCell: abstractEachCell,
        eachCellOnScreen: abstractEachCell.fill(undefined, undefined, true),
        updateScroll: function (top, left) {
            grid.scrollTop = top;
            grid.scrollLeft = left;
        },
        calcOffsets: function () {
            var newRowOffset = getOffset(grid.scrollTop, grid.cellHeight);
            var newColOffset = getOffset(grid.scrollLeft, grid.cellWidth);
            if (newColOffset !== grid.colOffset || newRowOffset !== grid.rowOffset) {
                grid.colOffset = newColOffset;
                grid.rowOffset = newRowOffset;
                return true; //notify that it was updated
            }
        }

    };

    grid.updateScroll(0, 0);
    grid.calcOffsets();


    return Object.create(grid);
};