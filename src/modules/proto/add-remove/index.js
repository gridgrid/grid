var core = require('@grid/proto/grid-core');
var absDivs = require('@grid/proto/grid-absolute-divs');
var util = require('@grid/proto/grid-util');

module.exports = function (container) {
    var $container = $(container);
    var grid = core(container);
    var cells = [];
    var opts = {
        buffer: 50, //number of cells to render on either side
        useScroller: true,
        debounce: 500
    };

    var debouncedUpdateOffsetsAndDraw;

    var $scroller;

    function buildCells() {
        $container.empty();
        grid.calc();
        $scroller = $('<div>');
        if (opts.useScroller) {
            $scroller.css({
                height: grid.rowPixelRange.end,
                width: grid.colPixelRange.end
            });
        }
        $container.append($scroller);
        $container.css({'overflow': 'auto'});
        debouncedUpdateOffsetsAndDraw = rawUpdateFn.debounce(opts.debounce);
    }

    function renderWindow() {
        var rowRange = Number.range(grid.rowOffset - opts.buffer, grid.rowOffset + grid.onScreenRows + opts.buffer);
        var colRange = Number.range(grid.colOffset - opts.buffer, grid.colOffset + grid.onScreenCols + opts.buffer);
        $scroller.remove();
        grid.eachCell(function (r, c) {
            var cell = cells[r] && cells[r][c];
            if (rowRange.contains(r) && colRange.contains(c)) {
                if (!cell) {

                    cell = $('<div>').css({
                        height: grid.cellHeight + 'px',
                        width: grid.cellWidth + 'px',
                        top: r * grid.cellHeight + 'px',
                        left: c * grid.cellWidth + 'px',
                        position: 'absolute'
                    }).addClass(util.getCellClass(r, c));
                    cell[0].innerHTML = r + ', ' + c;
                    cells[r] = cells[r] || [];
                    cells[r][c] = cell;
                }
                $scroller.append(cell);
            } else {
                if (cell) {
                    cell.remove();
                    if (cells[r]) {
                        cells[r][c] = undefined;
                    }
                }
            }
        });
        $container.append($scroller);
    }

    function rawUpdateFn() {
        grid.updateScroll($container.scrollTop(), $container.scrollLeft());
        if (grid.calcOffsets()) {
            renderWindow();
        }
    }

    $container.on('scroll', function () {
        debouncedUpdateOffsetsAndDraw();
    });

    return Object.merge(grid, {
        rebuild: function () {
            buildCells();
            renderWindow();
        },
        setOptions: function (options) {
            opts = options;
        }
    });
}