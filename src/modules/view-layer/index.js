var customEvent = require('@grid/custom-event');
var debounce = require('debounce');


module.exports = function (_grid) {
    var viewLayer = {};

    var grid = _grid;
    var container;
    var root;
    var cellContainer;
    var decoratorContainer;
    var borderWidth;

    var GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';

    var cells; //matrix of rendered cell elements;
    var rows; //array of all rendered rows

    viewLayer.viewPort = require('@grid/view-port')(grid);

    viewLayer.build = function (elem) {
        container = elem;
        viewLayer.viewPort.sizeToContainer(container);


        cleanup();
        cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
        buildCells(cellContainer);

        decoratorContainer = document.createElement('div');
        decoratorContainer.setAttribute('dts', 'grid-decorators');

        root = document.createElement('div');

        root.appendChild(cellContainer);
        root.appendChild(decoratorContainer);

        container.appendChild(root);

        //read the border width, for the rare case of larger than 1px borders, otherwise default to 1
        var jsGridCell = document.body.querySelector('.js-grid-cell');
        if (jsGridCell) {
            var computedStyle = getComputedStyle(jsGridCell);
            var borderWidthProp = computedStyle.getPropertyValue('border-left-width');
            borderWidth = parseInt(borderWidthProp);
        }
        borderWidth = isNaN(borderWidth) || !borderWidth ? 1 : borderWidth;
    };


    //only draw once per js turn, may need to create a synchronous version
    viewLayer.draw = debounce(function () {
        //return if we haven't built yet
        if (!container) {
            return;
        }

        if (grid.cellScrollModel.isDirty()) {
            drawCells();
        }

        if (grid.decorators.isDirty()) {
            drawDecorators();
        }

        grid.eventLoop.fire('grid-draw');
    }, 1);

    /* CELL LOGIC */
    function drawCells() {
        viewLayer.viewPort.iterateCells(function drawCell(r, c) {
            var cell = cells[r][c];
            var width = viewLayer.viewPort.getColWidth(c);
            cell.style.width = width + borderWidth + 'px';

            var left = viewLayer.viewPort.getColLeft(c);
            cell.style.left = left + 'px';


            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
            var virtualRow = viewLayer.viewPort.toVirtualRow(r);
            var virtualCol = viewLayer.viewPort.toVirtualCol(c);
            var formattedData = grid.dataModel.getFormatted(virtualRow, virtualCol);
            cell.appendChild(document.createTextNode(formattedData));
        }, function drawRow(r) {
            var height = viewLayer.viewPort.getRowHeight(r); //maybe faster to do this only on row iterations but meh
            var row = rows[r];
            row.style.height = height + borderWidth + 'px';
            var top = viewLayer.viewPort.getRowTop(r);
            row.style.top = top + 'px';
        });

        if (grid.cellScrollModel.row % 2) {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
        } else {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
        }
    }

    function buildCells(cellContainer) {
        cells = [];
        rows = [];
        var row;
        viewLayer.viewPort.iterateCells(function (r, c) {
            var cell = buildDivCell();
            cells[r][c] = cell;
            row.appendChild(cell);
        }, function (r) {
            cells[r] = [];
            row = document.createElement('div');
            row.setAttribute('class', 'grid-row');
            row.setAttribute('dts', 'grid-row');
            row.style.position = 'absolute';
            row.style.left = 0;
            row.style.right = 0;
            rows[r] = row;
            cellContainer.appendChild(row);
        });
    }

    function buildDivCell() {
        var cell = document.createElement('div');
        cell.setAttribute('dts', 'grid-cell');
        cell.setAttribute('class', 'grid-cell js-grid-cell');
        var style = cell.style;
        style.position = 'absolute';
        style.boxSizing = 'border-box';
        style.top = '0px';
        style.bottom = '0px';
        return cell;
    }

    /* END CELL LOGIC */

    /* DECORATOR LOGIC */
    function setPosition(boundingBox, top, left, height, width) {
        var style = boundingBox.style;
        style.top = top + 'px';
        style.left = left + 'px';
        style.height = height + 'px';
        style.width = width + 'px';
        style.position = 'absolute';
    }

    function drawDecorators() {
        var aliveDecorators = grid.decorators.getAlive();
        aliveDecorators.forEach(function (decorator) {

            var boundingBox = decorator.boundingBox;
            if (!boundingBox) {
                boundingBox = document.createElement('div');
                decorator.boundingBox = boundingBox;
                var decElement = decorator.render();
                if (decElement) {
                    boundingBox.appendChild(decElement);
                    decoratorContainer.appendChild(boundingBox);
                }
            }

            if (decorator.isDirty()) {
                switch (decorator.units) {
                    case 'px':
                        setPosition(boundingBox, decorator.top, decorator.left, decorator.height, decorator.width);
                        break;
                    case 'cell':
                    /* jshint -W086 */
                    default:

                        break;
                    /* jshint +W018 */
                }
            }
        });

        removeDecorators(grid.decorators.popAllDead());
    }

    function removeDecorators(decorators) {
        decorators.forEach(function (decorator) {
            var boundingBox = decorator.boundingBox;
            if (boundingBox) {
                //if they rendered an element previously we attached it to the bounding box as the only child
                var renderedElement = boundingBox.firstChild;
                if (renderedElement) {
                    //create a destroy dom event that bubbles
                    var destroyEvent = customEvent('decorator-destroy', true);
                    renderedElement.dispatchEvent(destroyEvent);
                }
                decoratorContainer.removeChild(boundingBox);
                decorator.boundingBox = undefined;
            }
        });
    }

    /* END DECORATOR LOGIC */

    viewLayer.destroy = cleanup;

    function cleanup() {
        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    return viewLayer;
};