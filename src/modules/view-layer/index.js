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
    var builtCols; //map from col index to an array of built elements for the column to update on scroll

    //add the cell classes through the standard method
    grid.cellClasses.add(grid.cellClasses.create(0, 0, CELL_CLASS, Infinity, Infinity, 'virtual'));

    var rowHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-row-header', Infinity, 0, 'virtual');
    var colHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-col-header', 0, Infinity, 'virtual');
    var fixedColClasses = grid.cellClasses.create(0, -1, 'grid-last-fixed-col', Infinity, 1, 'virtual');
    var fixedRowClasses = grid.cellClasses.create(-1, 0, 'grid-last-fixed-row', 1, Infinity, 'virtual');

    grid.cellClasses.add(rowHeaderClasses);
    grid.cellClasses.add(colHeaderClasses);
    grid.cellClasses.add(fixedRowClasses);
    grid.cellClasses.add(fixedColClasses);


    grid.eventLoop.bind('grid-col-change', function () {
        fixedColClasses.left = grid.colModel.numFixed() - 1;
        rowHeaderClasses.width = grid.colModel.numHeaders();
    });

    grid.eventLoop.bind('grid-row-change', function () {
        fixedRowClasses.top = grid.rowModel.numFixed() - 1;
        colHeaderClasses.height = grid.rowModel.numHeaders();
    });


    viewLayer.build = function (elem) {
        cleanup();

        container = elem;

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
        viewLayer._draw();
    }, 1);

    viewLayer._draw = function () {
        //return if we haven't built yet
        if (!container) {
            return;
        }
        var rebuilt = grid.viewPort.isDirty();
        if (rebuilt) {
            viewLayer._buildCells(cellContainer);
        }

        var builtColsDirty = grid.colBuilders.isDirty();
        if (rebuilt || builtColsDirty) {
            viewLayer._buildCols();
        }

        var cellsPositionOrSizeChanged = grid.colModel.isDirty() || grid.rowModel.isDirty() || grid.cellScrollModel.isDirty();

        if (grid.cellClasses.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
            viewLayer._drawCellClasses();
        }

        if (rebuilt || cellsPositionOrSizeChanged || builtColsDirty || grid.dataModel.isDirty()) {
            viewLayer._drawCells();
        }

        if (grid.decorators.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
            viewLayer._drawDecorators(cellsPositionOrSizeChanged);
        }

        grid.eventLoop.fire('grid-draw');
    };

    /* CELL LOGIC */
    function getBorderWidth() {
        return borderWidth || 1;
    }

    viewLayer._drawCells = function () {
        measureBorderWidth();
        var bWidth = getBorderWidth();
        var headerRows = grid.rowModel.numHeaders();
        var headerCols = grid.colModel.numHeaders();
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
            var data;
            if (r < headerRows || c < headerCols) {
                data = grid.dataModel.getHeader(virtualRow, virtualCol);
            } else {
                data = grid.dataModel.get(virtualRow - headerRows, virtualCol - headerCols);
            }
            var builder = grid.colBuilders.get(virtualCol);
            var cellChild;
            if (builder) {
                var builtElem = builtCols[virtualCol][r];
                cellChild = builder.update(builtElem, {
                    virtualCol: virtualCol,
                    virtualRow: virtualRow,
                    data: data
                });
            }
            //if we didn't get a child from the builder use a regular text node
            if (!cellChild) {
                cellChild = document.createTextNode(data.formatted);
            }
            cell.appendChild(cellChild);
        }, function drawRow(r) {
            var height = grid.viewPort.getRowHeight(r);
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


    viewLayer._buildCells = function buildCells(cellContainer) {
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
    };

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

    /* COL BUILDER LOGIC */
    viewLayer._buildCols = function () {
        builtCols = {};
        for (var c = 0; c < grid.colModel.length(); c++) {
            var builder = grid.colBuilders.get(c);
            if (builder) {
                builtCols[c] = [];
                for (var realRow = 0; realRow < grid.viewPort.rows; realRow++) {
                    builtCols[c][realRow] = builder.render();
                }
            }
        }
    };
    /* END COL BUILDER LOGIC */

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

    function positionCellDecoratorFromViewCellRange(realCellRange, boundingBox) {
        var realPxRange = grid.viewPort.toPx(realCellRange);
        positionDecorator(boundingBox, realPxRange.top, realPxRange.left, realPxRange.height + getBorderWidth(), realPxRange.width + getBorderWidth());
    }

    function createRangeForDescriptor(descriptor) {
        var range = {
            top: descriptor.top,
            left: descriptor.left,
            height: descriptor.height,
            width: descriptor.width
        };
        if (descriptor.space === 'data' && descriptor.units === 'cell') {
            range.top += grid.rowModel.numHeaders();
            range.left += grid.colModel.numHeaders();
        }
        return range;
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

            if (decorator.isDirty() || cellsPositionOrSizeChanged) {
                if (decorator.space === 'real') {
                    switch (decorator.units) {
                        case 'px':
                            positionDecorator(boundingBox, decorator.top, decorator.left, decorator.height, decorator.width);
                            break;
                        case 'cell':
                            positionCellDecoratorFromViewCellRange(decorator, boundingBox);
                            break;
                    }
                }
                else if (decorator.space === 'virtual' || decorator.space === 'data') {
                    switch (decorator.units) {
                        case 'px':
                            break;
                        case 'cell':
                        /* jshint -W086 */
                        default:
                            var range = createRangeForDescriptor(decorator);
                            var realCellRange = grid.viewPort.intersect(range);
                            if (realCellRange) {
                                positionCellDecoratorFromViewCellRange(realCellRange, boundingBox);
                            } else {
                                positionDecorator(boundingBox, -1, -1, -1, -1);
                            }
                            break;
                        /* jshint +W086 */
                    }

                }
            }
        });

        removeDecorators(grid.decorators.popAllDead());
    };

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
            var range = createRangeForDescriptor(descriptor);
            var intersection = grid.viewPort.intersect(range);
            if (intersection) {
                rowLoop:
                    for (var r = 0; r < intersection.height; r++) {
                        for (var c = 0; c < intersection.width; c++) {
                            var row = intersection.top + r;
                            var col = intersection.left + c;

                            var cellRow = cells[row];
                            if (!cellRow) {
                                continue rowLoop;
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
    };

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