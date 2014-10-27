var customEvent = require('@grid/custom-event');
var debounce = require('@grid/debounce');
var util = require('@grid/util');


module.exports = function (_grid) {
    var viewLayer = {};


    var grid = _grid;
    var container;
    var root;
    var cellContainer;
    var decoratorContainer;
    var borderWidth;

    var GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';
    var GRID_VIEW_ROOT_CLASS = 'js-grid-view-root';
    var CELL_CLASS = 'grid-cell';

    var cells; //matrix of rendered cell elements;
    var rows; //array of all rendered rows

    //add the cell classes through the standard way

    grid.cellClasses.add(grid.cellClasses.create(0, 0, CELL_CLASS, Infinity, Infinity));

    viewLayer.build = function (elem) {
        container = elem;


        cleanup();
        cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
        util.position(cellContainer, 0, 0, 0, 0);
        cellContainer.style.zIndex = 0;

        decoratorContainer = document.createElement('div');
        decoratorContainer.setAttribute('dts', 'grid-decorators');
        util.position(decoratorContainer, 0, 0, 0, 0);
        decoratorContainer.style.zIndex = 0;
        decoratorContainer.style.pointerEvents = 'none';

        root = document.createElement('div');
        root.setAttribute('class', GRID_VIEW_ROOT_CLASS);

        root.appendChild(cellContainer);
        root.appendChild(decoratorContainer);

        container.appendChild(root);

    };


    function measureBorderWidth() {
        //read the border width, for the rare case of larger than 1px borders, otherwise the draw will default to 1
        if (borderWidth) {
            return;
        }
        var jsGridCell = cells[0] && cells[0][0];
        if (jsGridCell) {
            var oldClass = jsGridCell.className;
            jsGridCell.className = CELL_CLASS;
            var computedStyle = getComputedStyle(jsGridCell);
            var borderWidthProp = computedStyle.getPropertyValue('border-left-width');
            borderWidth = parseInt(borderWidthProp);
            jsGridCell.className = oldClass;
        }
        borderWidth = isNaN(borderWidth) || !borderWidth ? undefined : borderWidth;
        return borderWidth;
    }

    //only draw once per js turn, may need to create a synchronous version
    viewLayer.draw = debounce(function () {
        //return if we haven't built yet
        if (!container) {
            return;
        }
        var viewPortDirty = grid.viewPort.isDirty();
        if (viewPortDirty) {
            viewLayer._buildCells(cellContainer);
        }
        var colModelDirty = grid.colModel.isDirty();
        var cellScrollDirty = grid.cellScrollModel.isDirty();
        var cellsPositionOrSizeChanged = colModelDirty || cellScrollDirty;

        if (viewPortDirty || grid.cellClasses.isDirty() || cellsPositionOrSizeChanged) {
            viewLayer._drawCellClasses();
        }

        if (viewPortDirty || cellsPositionOrSizeChanged) {
            viewLayer._drawCells();
        }


        if (grid.decorators.isDirty() || viewPortDirty || cellsPositionOrSizeChanged) {
            viewLayer._drawDecorators(cellsPositionOrSizeChanged);
        }

        grid.eventLoop.fire('grid-draw');
    }, 1);

    /* CELL LOGIC */
    function getBorderWidth() {
        return borderWidth || 1;
    }

    viewLayer._drawCells = function () {
        measureBorderWidth()
        var bWidth = getBorderWidth();
        grid.viewPort.iterateCells(function drawCell(r, c) {
            var cell = cells[r][c];
            var width = grid.viewPort.getColWidth(c);
            cell.style.width = width + bWidth + 'px';

            var left = grid.viewPort.getColLeft(c);
            cell.style.left = left + 'px';

            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
            var virtualRow = grid.viewPort.toVirtualRow(r);
            var virtualCol = grid.viewPort.toVirtualCol(c);
            var formattedData = grid.dataModel.getFormatted(virtualRow, virtualCol);
            cell.appendChild(document.createTextNode(formattedData));
        }, function drawRow(r) {
            var height = grid.viewPort.getRowHeight(r); //maybe faster to do this only on row iterations but meh
            var row = rows[r];
            row.style.height = height + bWidth + 'px';
            var top = grid.viewPort.getRowTop(r);
            row.style.top = top + 'px';
        });

        if (grid.cellScrollModel.row % 2) {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
        } else {
            cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
        }
    };

    function buildCells(cellContainer) {
        while (cellContainer.firstChild) {
            cellContainer.removeChild(cellContainer.firstChild);
        }


        cells = [];
        rows = [];
        var row;
        grid.viewPort.iterateCells(function (r, c) {
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

    viewLayer._buildCells = buildCells;

    function buildDivCell() {
        var cell = document.createElement('div');
        cell.setAttribute('dts', 'grid-cell');
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

    function positionDecorator(bounding, t, l, h, w) {
        setPosition(bounding, t, l, util.clamp(h, 0, grid.viewPort.height), util.clamp(w, 0, grid.viewPort.width));
    }

    function positionCellDecoratorFromRealCellRange(realCellRange, boundingBox) {
        var realPxRange = grid.viewPort.toPx(realCellRange);
        positionDecorator(boundingBox, realPxRange.top, realPxRange.left, realPxRange.height + getBorderWidth(), realPxRange.width + getBorderWidth());
    }

    viewLayer._drawDecorators = function (cellsPositionOrSizeChanged) {
        var aliveDecorators = grid.decorators.getAlive();
        aliveDecorators.forEach(function (decorator) {

            var boundingBox = decorator.boundingBox;
            if (!boundingBox) {
                boundingBox = document.createElement('div');
                boundingBox.style.pointerEvents = 'none';
                decorator.boundingBox = boundingBox;
                var decElement = decorator.render();
                if (decElement) {
                    boundingBox.appendChild(decElement);
                    decoratorContainer.appendChild(boundingBox);
                }
            }

            if ((decorator.isDirty() || cellsPositionOrSizeChanged) && decorator.space === 'real') {
                switch (decorator.units) {
                    case 'px':
                        positionDecorator(boundingBox, decorator.top, decorator.left, decorator.height, decorator.width);
                        break;
                    case 'cell':
                        positionCellDecoratorFromRealCellRange(decorator, boundingBox);
                        break;
                }
            } else if ((decorator.isDirty() || cellsPositionOrSizeChanged) && decorator.space === 'virtual') {
                switch (decorator.units) {
                    case 'px':
                        break;
                    case 'cell':
                    /* jshint -W086 */
                    default:
                        var realCellRange = grid.viewPort.intersect(decorator);
                        if (realCellRange) {
                            positionCellDecoratorFromRealCellRange(realCellRange, boundingBox);
                        } else {
                            positionDecorator(boundingBox, -1, -1, -1, -1);
                        }
                        break;
                    /* jshint +W086 */
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

    /* CELL CLASSES LOGIC */
    viewLayer._drawCellClasses = function () {
        grid.viewPort.iterateCells(function (r, c) {
            cells[r][c].className = '';
        });
        grid.cellClasses.getAll().forEach(function (descriptor) {
            var intersection = grid.viewPort.intersect(descriptor);
            if (intersection) {
                rowloop:
                    for (var r = 0; r < intersection.height; r++) {
                        for (var c = 0; c < intersection.width; c++) {
                            var row = intersection.top + r;
                            var col = intersection.left + c;

                            var cellRow = cells[row];
                            if (!cellRow) {
                                continue rowloop;
                            }
                            var cell = cellRow[col];
                            if (!cell) {
                                continue;
                            }
                            cell.className = (cell.className ? cell.className + ' ' : '') + descriptor.class;
                        }
                    }
            }
        });
    }

    /* END CELL CLASSES LOGIC*/

    viewLayer.destroy = cleanup;

    function cleanup() {
        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
        if (!container) {
            return;
        }
        var querySelectorAll = container.querySelectorAll('.' + GRID_VIEW_ROOT_CLASS);
        for (var i = 0; i < querySelectorAll.length; ++i) {
            var root = querySelectorAll[i];
            container.removeChild(root);
        }
    }

    grid.eventLoop.bind('grid-destroy', function () {
        viewLayer.destroy();
        clearTimeout(viewLayer.draw.timeout);
    });

    return viewLayer;
};