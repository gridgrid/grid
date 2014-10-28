var mousewheel = require('@grid/mousewheel');
var core = require('@grid/proto/grid-core');
var gridAbsoluteDivs = require('@grid/proto/grid-absolute-divs');

module.exports = function (container) {
    var $container = $(container);
    var grid = core(container);
    //build grid


    var cells = [];
    var opts = {
        useTextNodes: false,
        precreatedTextNodes: true,
        htmlOnlyText: false,
        htmlAnchor: false
    };


    function buildCells() {
        grid.calc();
        $container.empty();

        grid.eachCellOnScreen(function (r, c) {
            var cell = gridAbsoluteDivs.makeCell(r, c, grid);
            cells[r][c] = cell;
            $container.append(cell);
        }, function (r) {
            cells[r] = [];
        });
    }

    function getNodeValue(r, c) {
        var rowValue = (r + grid.rowOffset);
        return rowValue + ',' + (c + grid.colOffset);
    }

    function writeTableValues() {
        grid.eachCellOnScreen(function (r, c) {
            var $cell = cells[r][c];
            if (opts.useTextNodes) {
                if (opts.precreatedTextNodes) {
                    $cell[0].childNodes[0].nodeValue = getNodeValue(r, c);
                } else {
                    while ($cell[0].firstChild) {
                        $cell[0].removeChild($cell[0].firstChild);
                    }
                    $cell[0].appendChild(document.createTextNode(getNodeValue(r, c)));
                }
            } else {
                var html;
                var cellText = (r + grid.rowOffset) + ',' + (c + grid.colOffset);
                if (opts.htmlOnlyText) {
                    html = cellText;
                } else if (opts.htmlAnchor) {
                    html = '<a href="www.google.com">' + cellText + '</a>';
                } else {
                    html = '<span>' + cellText + '</span>';
                }
                $cell[0].innerHTML = html;
            }

        });

        if (grid.rowOffset % 2 === 1) {
            $container.addClass('odds');
        } else {
            $container.removeClass('odds');
        }
    }

    var calcOffsetAndDraw = function () {
        if (grid.calcOffsets()) {
            writeTableValues();
        }

    }.debounce(1);

    //scroll
    var onMouseWheel = function (e) {
        e.preventDefault();
        var event = e.originalEvent || e;
        var yDelta = mousewheel.getDelta(event);
        var xDelta = mousewheel.getDelta(event, true);
        grid.updateScroll(grid.rowPixelRange.clamp(grid.scrollTop - yDelta), grid.colPixelRange.clamp(grid.scrollLeft - xDelta));
        calcOffsetAndDraw();
    };
    $container.on('mousewheel', onMouseWheel);
    $container.on('wheel', onMouseWheel);

    return Object.merge(grid, {
        rebuild: function () {
            buildCells();
            writeTableValues();
        },
        setOptions: function (options) {
            opts = options;
        }
    });
};
