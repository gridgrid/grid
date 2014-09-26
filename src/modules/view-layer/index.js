var customEvent = require('@grid/custom-event');


module.exports = function (_grid) {
    var viewLayer = {};

    var grid = _grid;
    var container;
    var root;
    var cellContainer;
    var decoratorContainer;
    var boundingBoxes;

    var cells; //matrix of rendered cell elements;

    viewLayer.viewPort = require('@grid/view-port')(grid);

    viewLayer.build = function (elem) {
        container = elem;
        viewLayer.viewPort.sizeToContainer(container);


        cleanup();
        cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        buildCells(cellContainer);

        decoratorContainer = document.createElement('div');
        decoratorContainer.setAttribute('dts', 'grid-decorators');

        root = document.createElement('div');

        root.appendChild(cellContainer);
        root.appendChild(decoratorContainer);

        container.appendChild(root);
    };


    viewLayer.draw = function () {
        if (grid.cellScrollModel.isDirty()) {
            drawCells();
        }

        if (grid.decorators.isDirty()) {
            drawDecorators();
        }

        grid.eventLoop.fire('grid-draw');
    };

    function drawDecorators() {
        var aliveDecorators = grid.decorators.getAlive();
        aliveDecorators.forEach(function (decorator) {

            var boundingBox = decorator.boundingBox;
            if (!boundingBox) {
                boundingBox = document.createElement('div');
                decorator.boundingBox = boundingBox;
                var decElement = decorator.render();
                boundingBox.appendChild(decElement);
                decoratorContainer.appendChild(boundingBox);
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
            }
        });
    }

    function drawCells() {
        viewLayer.viewPort.iterateCells(function (r, c) {
            var cell = cells[r][c];
            var width = grid.virtualPixelCellModel.width(c);
            var height = grid.virtualPixelCellModel.height(r); //maybe faster to do this only on row iterations but meh
            cell.style.width = width + 'px';
            cell.style.height = height + 'px';

            var top = viewLayer.viewPort.getRowTop(r);
            var left = viewLayer.viewPort.getColLeft(c);
            cell.style.top = top + 'px';
            cell.style.left = left + 'px';

            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
            var modelR = r + grid.cellScrollModel.row;
            var modelC = c + grid.cellScrollModel.col;
            var formattedData = grid.dataModel.getFormatted(modelR, modelC);
            cell.appendChild(document.createTextNode(formattedData));
        });
    }

    function buildCells(cellContainer) {
        cells = [];
        viewLayer.viewPort.iterateCells(function (r, c) {
            var cell = buildDivCell();
            cells[r][c] = cell;
            cellContainer.appendChild(cell);
        }, function (r) {
            cells[r] = [];
        });
    }

    function buildDivCell() {
        var cell = document.createElement('div');
        cell.setAttribute('dts', 'grid-cell');
        var style = cell.style;
        style.position = 'absolute';
        style.boxSizing = 'border-box';
        return cell;
    }

    viewLayer.destroy = cleanup;

    function cleanup() {
        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    return viewLayer;
};