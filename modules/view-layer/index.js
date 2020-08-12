"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var custom_event_1 = require("../custom-event");
var event_loop_1 = require("../event-loop");
var util = require("../util");
function create(grid) {
    var container;
    var root;
    var cellContainerTL;
    var cellContainerTR;
    var cellContainerBL;
    var cellContainerBR;
    var decoratorContainerTL;
    var decoratorContainerTR;
    var decoratorContainerBL;
    var decoratorContainerBR;
    var borderWidth;
    var hoveredFixedRow;
    var hoveredRow;
    var GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';
    var GRID_VIEW_ROOT_CLASS = 'js-grid-view-root';
    var CELL_CLASS = 'grid-cell';
    var cells;
    var rows = {
        fixed: [],
        nonFixed: []
    };
    var builtCols = {};
    var builtRows = {};
    var drawRequestedId;
    var viewLayer = {
        build: function (elem) {
            cleanup();
            container = elem;
            cellContainerTL = makeCellContainer();
            cellContainerTL.style.zIndex = '4';
            cellContainerTR = makeCellContainer();
            cellContainerTR.style.zIndex = '3';
            cellContainerBL = makeCellContainer();
            cellContainerBL.style.zIndex = '3';
            cellContainerBR = makeCellContainer();
            cellContainerBR.style.zIndex = '2';
            decoratorContainerTL = makeDecoratorContainer();
            decoratorContainerTL.style.zIndex = '4';
            decoratorContainerTR = makeDecoratorContainer();
            decoratorContainerTR.style.zIndex = '3';
            decoratorContainerTR.style.overflow = 'hidden';
            decoratorContainerBL = makeDecoratorContainer();
            decoratorContainerBL.style.zIndex = '3';
            decoratorContainerBL.style.overflow = 'hidden';
            decoratorContainerBR = makeDecoratorContainer();
            decoratorContainerBR.style.zIndex = '2';
            root = document.createElement('div');
            root.setAttribute('class', GRID_VIEW_ROOT_CLASS);
            root.appendChild(cellContainerTL);
            root.appendChild(cellContainerTR);
            root.appendChild(cellContainerBL);
            root.appendChild(cellContainerBR);
            root.appendChild(decoratorContainerTL);
            root.appendChild(decoratorContainerTR);
            root.appendChild(decoratorContainerBL);
            root.appendChild(decoratorContainerBR);
            container.appendChild(root);
        },
        draw: function () {
            if (drawRequestedId === undefined) {
                drawRequestedId = requestAnimationFrame(draw);
            }
        },
        eventIsOnCells: function (e) {
            var target = e.target;
            if (!target) {
                return false;
            }
            if (targetIsElement(target) && target.classList.contains('grid-cell') || target === grid.textarea) {
                return true;
            }
            if (!event_loop_1.isAnnotatedEvent(e)) {
                return false;
            }
            var renderedColElement = builtCols && builtCols[e.realCol];
            var renderedRowElement = builtRows && builtRows[e.realRow];
            if (renderedColElement && !grid.view.col.get(e.realCol).isBuiltActionable) {
                var elem = renderedColElement[e.realRow];
                return isTargetInElem(target, elem);
            }
            else if (renderedRowElement && !grid.view.row.get(e.realRow).isBuiltActionable) {
                var elem = renderedRowElement[e.realCol];
                return isTargetInElem(target, elem);
            }
            return false;
        },
        setTextContent: function (elem, text) {
            if (!elem) {
                return;
            }
            if (elem.firstChild && elem.firstChild.nodeType === 3) {
                elem.firstChild.nodeValue = text;
            }
            else {
                elem.textContent = text;
            }
        },
        getBorderWidth: getBorderWidth,
        _drawCells: drawCells,
        _buildCells: buildCells,
        _buildCols: buildCols,
        _buildRows: buildRows,
        _drawDecorators: drawDecorators,
        _drawCellClasses: drawCellClasses,
    };
    var targetIsElement = function (e) { return !!e.classList; };
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
    grid.eventLoop.bind('grid-cell-mouse-move', function (e) {
        var row = rows.fixed[e.realRow];
        if (!row || !viewLayer.eventIsOnCells(e)) {
            return;
        }
        row.classList.add('hover');
        if (hoveredFixedRow && hoveredFixedRow !== row) {
            hoveredFixedRow.classList.remove('hover');
        }
        hoveredFixedRow = row;
        row = rows.nonFixed[e.realRow];
        if (row) {
            row.classList.add('hover');
        }
        if (hoveredRow && hoveredRow !== row) {
            hoveredRow.classList.remove('hover');
        }
        hoveredRow = row;
    });
    function makeCellContainer() {
        var cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
        cellContainer.style.zIndex = '';
        return cellContainer;
    }
    function makeDecoratorContainer() {
        var decoratorContainer = document.createElement('div');
        decoratorContainer.setAttribute('dts', 'grid-decorators');
        util.position(decoratorContainer, 0, 0, 0, 0);
        decoratorContainer.style.zIndex = '';
        decoratorContainer.style.pointerEvents = 'none';
        return decoratorContainer;
    }
    function offsetContainerForPixelScroll() {
        var modTopPixels = grid.pixelScrollModel.offsetTop;
        var modLeftPixels = grid.pixelScrollModel.offsetLeft;
        var fixedHeight = grid.virtualPixelCellModel.fixedHeight();
        var fixedWidth = grid.virtualPixelCellModel.fixedWidth();
        util.position(cellContainerTL, 0, 0, undefined, undefined, fixedHeight, fixedWidth);
        util.position(cellContainerBR, 0, 0, 0, 0);
        util.position3D(cellContainerBR, modTopPixels, modLeftPixels);
        util.position(cellContainerTR, 0, 0, undefined, 0, fixedHeight);
        util.position3D(cellContainerTR, 0, modLeftPixels);
        util.position(cellContainerBL, 0, 0, 0, undefined, undefined, fixedWidth);
        util.position3D(cellContainerBL, modTopPixels, 0);
        util.position(decoratorContainerTL, 0, 0, undefined, undefined, fixedHeight, fixedWidth);
        util.position(decoratorContainerBR, 0, 0, 0, 0);
        util.position3D(decoratorContainerBR, modTopPixels, modLeftPixels);
        util.position(decoratorContainerTR, 0, fixedWidth, undefined, 0, undefined, undefined);
        util.position3D(decoratorContainerTR, 0, 0);
        util.position(decoratorContainerBL, fixedHeight, 0, 0, undefined, undefined, undefined);
        util.position3D(decoratorContainerBL, 0, 0);
        grid.decorators.getAlive().forEach(function (decorator) {
            var decoratorTopOffset = 0;
            var decoratorLeftOffset = 0;
            if (decorator.scrollVert && !decorator.scrollHorz) {
                decoratorTopOffset = fixedHeight - modTopPixels;
            }
            else if (decorator.scrollHorz && !decorator.scrollVert) {
                decoratorLeftOffset = fixedWidth - modLeftPixels;
            }
            if (decorator.fixed) {
                if (decorator.scrollVert) {
                    decoratorTopOffset += modTopPixels;
                }
                if (decorator.scrollHorz) {
                    decoratorLeftOffset += modLeftPixels;
                }
            }
            if (decorator.boundingBox) {
                decorator.boundingBox.style.marginTop = -1 * decoratorTopOffset + 'px';
                decorator.boundingBox.style.marginLeft = -1 * decoratorLeftOffset + 'px';
            }
        });
    }
    function measureBorderWidth() {
        if (borderWidth) {
            return;
        }
        var jsGridCell = cells[0] && cells[0][0];
        if (jsGridCell) {
            var oldClass = jsGridCell.className;
            jsGridCell.className = CELL_CLASS;
            var computedStyle = getComputedStyle(jsGridCell);
            var borderWidthProp = computedStyle.getPropertyValue('border-left-width');
            borderWidth = parseInt(borderWidthProp, 10);
            jsGridCell.className = oldClass;
        }
        borderWidth = (!borderWidth || isNaN(borderWidth)) ? undefined : borderWidth;
        return borderWidth;
    }
    function draw() {
        drawRequestedId = undefined;
        if (!container || grid.destroyed) {
            return;
        }
        if (!grid.opts.snapToCell && grid.fps.slowCount > 10) {
            grid.opts.snapToCell = true;
        }
        var rebuilt = grid.viewPort.isDirty();
        if (rebuilt) {
            viewLayer._buildCells();
        }
        var builtColsDirty = grid.colModel.areBuildersDirty();
        if (rebuilt || builtColsDirty) {
            viewLayer._buildCols();
        }
        var builtRowsDirty = grid.rowModel.areBuildersDirty();
        if (rebuilt || builtRowsDirty) {
            viewLayer._buildRows();
        }
        var cellsPositionOrSizeChanged = grid.colModel.isDirty() || grid.rowModel.isDirty() || grid.cellScrollModel.isDirty();
        if (grid.cellClasses.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
            viewLayer._drawCellClasses();
        }
        var drawingCells = rebuilt || cellsPositionOrSizeChanged || builtColsDirty || builtRowsDirty || grid.dataModel.isDirty();
        if (drawingCells) {
            viewLayer._drawCells();
        }
        var drawingDecorators = grid.decorators.isDirty() || rebuilt || cellsPositionOrSizeChanged;
        if (drawingDecorators) {
            viewLayer._drawDecorators(cellsPositionOrSizeChanged || rebuilt);
        }
        if (grid.pixelScrollModel.isOffsetDirty() || drawingDecorators) {
            offsetContainerForPixelScroll();
        }
        grid.eventLoop.fire('grid-draw');
    }
    function getBorderWidth() {
        return borderWidth || 1;
    }
    function drawCells() {
        measureBorderWidth();
        var bWidth = getBorderWidth();
        var headerRows = grid.rowModel.numHeaders();
        var headerCols = grid.colModel.numHeaders();
        var totalVisibleCellWidth = 0;
        var lastVirtualCol;
        var lastVirtualRow;
        var widths = [];
        var lefts = [];
        var virtualCols = [];
        function positionRow(row, height, top, virtualRow) {
            if (!row) {
                return;
            }
            if (height === 0 || lastVirtualRow === virtualRow) {
                row.style.display = 'none';
                return;
            }
            row.style.display = '';
            row.style.height = height + bWidth + 'px';
            row.style.top = top + 'px';
        }
        grid.viewPort.iterateCells(function drawCell(r, c) {
            var cell = cells[r][c];
            var width = widths[c] || (widths[c] = grid.viewPort.getColWidth(c));
            var virtualCol = virtualCols[c] || (virtualCols[c] = grid.viewPort.toVirtualCol(c));
            if (width === 0 || virtualCol === lastVirtualCol) {
                cell.style.display = 'none';
                return;
            }
            if (r === 0) {
                totalVisibleCellWidth += width;
            }
            lastVirtualCol = virtualCol;
            cell.style.display = '';
            cell.style.width = width + bWidth + 'px';
            var left = lefts[c] || (lefts[c] = grid.viewPort.getColLeft(c));
            cell.style.left = left + 'px';
            var virtualRow = grid.viewPort.toVirtualRow(r);
            var data = (r < headerRows || c < headerCols) ?
                grid.dataModel.getHeader(virtualRow, virtualCol) :
                grid.dataModel.get(grid.rowModel.toData(virtualRow), grid.colModel.toData(virtualCol));
            var builder = grid.rowModel.get(virtualRow).builder;
            var hasRowBuilder = true;
            if (!builder || (virtualCol < headerCols && !builder.includeHeaders)) {
                hasRowBuilder = false;
                builder = grid.colModel.get(virtualCol).builder;
                if (builder && virtualRow < headerRows && !builder.includeHeaders) {
                    builder = undefined;
                }
            }
            var cellChild;
            if (builder) {
                var builtElem = (hasRowBuilder) ?
                    builtRows[virtualRow][c] :
                    builtCols[virtualCol][r];
                cellChild = builder.update(builtElem, {
                    virtualCol: virtualCol,
                    virtualRow: virtualRow,
                    data: data
                });
            }
            if (!cellChild) {
                viewLayer.setTextContent(cell, data.formatted);
            }
            else {
                var notSameElem = cell.firstChild !== cellChild;
                if (cell.firstChild && notSameElem) {
                    cell.removeChild(cell.firstChild);
                }
                if (notSameElem) {
                    cell.appendChild(cellChild);
                }
            }
        }, function drawRow(r) {
            var height = grid.viewPort.getRowHeight(r);
            var virtualRow = grid.view.row.toVirtual(r);
            var top = grid.viewPort.getRowTop(r);
            positionRow(rows.fixed[r], height, top, virtualRow);
            positionRow(rows.nonFixed[r], height, top, virtualRow);
            lastVirtualRow = virtualRow;
            lastVirtualCol = undefined;
        });
        rows.nonFixed.forEach(function (row) {
            row.style.width = totalVisibleCellWidth + 'px';
        });
        rows.fixed.forEach(function (row) {
            row.style.width = grid.virtualPixelCellModel.fixedWidth() + 'px';
        });
        if (grid.cellScrollModel.row % 2) {
            cellContainerBR.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
            cellContainerBL.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
        }
        else {
            doToAllCellContainers(function (cellContainer) {
                cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
            });
        }
    }
    function clearCellContainer(cellContainer) {
        while (cellContainer.firstChild) {
            cellContainer.removeChild(cellContainer.firstChild);
        }
    }
    function doToAllCellContainers(fn) {
        fn(cellContainerTL);
        fn(cellContainerTR);
        fn(cellContainerBL);
        fn(cellContainerBR);
    }
    function getCellContainer(r, c) {
        var fixedRow = r < grid.rowModel.numFixed();
        var fixedCol = c < grid.colModel.numFixed();
        if (fixedRow && fixedCol) {
            return cellContainerTL;
        }
        else if (fixedRow) {
            return cellContainerTR;
        }
        else if (fixedCol) {
            return cellContainerBL;
        }
        return cellContainerBR;
    }
    function buildRow(r) {
        var row = document.createElement('div');
        row.setAttribute('class', 'grid-row');
        row.setAttribute('dts', 'grid-row');
        row.style.position = 'absolute';
        row.style.left = '0';
        if (r < grid.rowModel.numHeaders()) {
            row.classList.add('grid-is-header');
        }
        return row;
    }
    function buildCells() {
        doToAllCellContainers(clearCellContainer);
        cells = [];
        rows.fixed = [];
        rows.nonFixed = [];
        var row;
        grid.viewPort.iterateCells(function (r, c) {
            if (c === 0) {
                cells[r] = [];
            }
            if (c === grid.colModel.numFixed()) {
                row = rows.nonFixed[r] = buildRow(r);
            }
            else if (c === 0) {
                row = rows.fixed[r] = buildRow(r);
            }
            var cell = buildDivCell();
            cells[r][c] = cell;
            row.appendChild(cell);
            getCellContainer(r, c).appendChild(row);
        });
    }
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
    function destroyRenderedElems(oldElems) {
        if (!oldElems) {
            return;
        }
        oldElems.forEach(function (oldElem) {
            if (!oldElem) {
                return;
            }
            var destroyEvent = custom_event_1.default('grid-rendered-elem-destroy', true);
            oldElem.dispatchEvent(destroyEvent);
        });
    }
    function buildCols() {
        builtCols = buildDimension(grid.cols, grid.rows, builtCols, function (viewCol, viewRow, previousElement) { return ({
            viewRow: viewRow,
            viewCol: viewCol,
            previousElement: previousElement
        }); });
    }
    function buildRows() {
        builtRows = buildDimension(grid.rows, grid.cols, builtRows, function (viewRow, viewCol, previousElement) { return ({
            viewRow: viewRow,
            viewCol: viewCol,
            previousElement: previousElement
        }); });
    }
    function buildDimension(dimension, crossDimension, previouslyBuiltElems, getRenderContext) {
        var builtElems = {};
        for (var i = 0; i < dimension.rowColModel.length(true); i++) {
            var builder = dimension.rowColModel.get(i).builder;
            var oldElems = previouslyBuiltElems && previouslyBuiltElems[i];
            if (builder) {
                builtElems[i] = [];
                destroyRenderedElems(oldElems);
                for (var realI = 0; realI < crossDimension.viewPort.count; realI++) {
                    builtElems[i][realI] = builder.render(getRenderContext(dimension.converters.virtual.toView(i), realI, oldElems && oldElems[realI]));
                }
            }
        }
        return builtElems;
    }
    function setPosition(boundingBox, top, left, height, width) {
        var style = boundingBox.style;
        if (height <= 0 || width <= 0) {
            style.display = 'none';
            return false;
        }
        style.display = '';
        style.top = top + 'px';
        style.left = left + 'px';
        style.height = height + 'px';
        style.width = width + 'px';
        style.position = 'absolute';
    }
    function positionDecorator(bounding, t, l, h, w) {
        return setPosition(bounding, t, l, util.clamp(h, 0, grid.viewPort.height), util.clamp(w, 0, grid.viewPort.width));
    }
    function positionCellDecoratorFromViewCellRange(realCellRange, boundingBox) {
        var realPxRange = grid.viewPort.toPx(realCellRange);
        return positionDecorator(boundingBox, realPxRange.top, realPxRange.left, realPxRange.height && realPxRange.height + getBorderWidth(), realPxRange.width && realPxRange.width + getBorderWidth());
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
    function drawDecorators(cellsPositionOrSizeChanged) {
        var aliveDecorators = grid.decorators.getAlive();
        aliveDecorators.forEach(function (decorator) {
            var hasBeenRendered = !!decorator.boundingBox;
            var boundingBox = decorator.boundingBox || document.createElement('div');
            if (!hasBeenRendered) {
                boundingBox.style.pointerEvents = 'none';
                decorator.boundingBox = boundingBox;
                var decElement = decorator.render();
                if (decElement) {
                    boundingBox.appendChild(decElement);
                }
            }
            if (decorator.isDirty() || cellsPositionOrSizeChanged || !hasBeenRendered) {
                var vCol = decorator.left;
                var vRow = decorator.top;
                if (decorator.space === 'real') {
                    vCol = grid.view.col.toVirtual(vCol);
                    vRow = grid.view.row.toVirtual(vRow);
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
                    if (decorator.space === 'data') {
                        vCol = grid.data.col.toVirtual(vCol);
                        vRow = grid.data.row.toVirtual(vRow);
                    }
                    switch (decorator.units) {
                        case 'px':
                            break;
                        case 'cell':
                        default:
                            var range = createRangeForDescriptor(decorator);
                            var realCellRange = grid.viewPort.intersect(range);
                            if (realCellRange) {
                                positionCellDecoratorFromViewCellRange(realCellRange, boundingBox);
                            }
                            else {
                                positionDecorator(boundingBox, -1, -1, -1, -1);
                            }
                            break;
                    }
                }
                var parent_1 = boundingBox.parentElement;
                if (parent_1) {
                    parent_1.removeChild(boundingBox);
                }
                var fixedRow = vRow < grid.rowModel.numFixed();
                var fixedCol = vCol < grid.colModel.numFixed();
                if (fixedRow && fixedCol) {
                    decorator.scrollHorz = false;
                    decorator.scrollVert = false;
                    decoratorContainerTL.appendChild(boundingBox);
                }
                else if (fixedRow) {
                    decorator.scrollHorz = true;
                    decorator.scrollVert = false;
                    decoratorContainerTR.appendChild(boundingBox);
                }
                else if (fixedCol) {
                    decorator.scrollHorz = false;
                    decorator.scrollVert = true;
                    decoratorContainerBL.appendChild(boundingBox);
                }
                else {
                    decorator.scrollHorz = true;
                    decorator.scrollVert = true;
                    decoratorContainerBR.appendChild(boundingBox);
                }
            }
        });
        removeDecorators(grid.decorators.popAllDead());
    }
    function removeDecorators(decorators) {
        decorators.forEach(function (decorator) {
            if (!decorator) {
                return;
            }
            var boundingBox = decorator.boundingBox;
            if (boundingBox) {
                var renderedElement = boundingBox.firstChild;
                if (renderedElement) {
                    var destroyEvent = custom_event_1.default('decorator-destroy', true);
                    renderedElement.dispatchEvent(destroyEvent);
                }
                var parent_2 = boundingBox.parentElement;
                if (parent_2) {
                    parent_2.removeChild(boundingBox);
                }
                decorator.boundingBox = undefined;
            }
        });
    }
    function drawCellClasses() {
        grid.viewPort.iterateCells(function (r, c) {
            var classes = grid.cellClasses.getCachedClasses(grid.view.row.toVirtual(r), grid.view.col.toVirtual(c));
            cells[r][c].className = classes.join(' ');
        });
    }
    function destroyPreviouslyBuilt(built) {
        if (!built) {
            return;
        }
        Object.keys(built).forEach(function (key) {
            destroyRenderedElems(built[key]);
        });
    }
    function cleanup() {
        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
        destroyPreviouslyBuilt(builtCols);
        destroyPreviouslyBuilt(builtRows);
        if (!container) {
            return;
        }
        var gridViewRoots = container.querySelectorAll('.' + GRID_VIEW_ROOT_CLASS);
        for (var i = 0; i < gridViewRoots.length; ++i) {
            container.removeChild(gridViewRoots[i]);
        }
    }
    function isTargetInElem(target, elem) {
        if (!target || !targetIsElement(target)) {
            return false;
        }
        var t = target;
        while (t && !t.classList.contains('grid-container')) {
            if (t === elem) {
                return true;
            }
            t = t.parentElement;
        }
        return false;
    }
    grid.eventLoop.bind('grid-destroy', function () {
        cleanup();
        if (drawRequestedId) {
            cancelAnimationFrame(drawRequestedId);
        }
        viewLayer.draw = function () { };
    });
    return viewLayer;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map