import { IBuilderRenderContext } from '../abstract-row-col-model';
import { Grid, IGridDimension } from '../core';
import customEvent from '../custom-event';
import { IDecorator } from '../decorators';
import { EventUnion, isAnnotatedEvent } from '../event-loop';
import { RawPositionRange } from '../position-range';
import * as util from '../util';

type IViewLayerDecorator = RawPositionRange & IDecorator & {
  scrollHorz?: boolean;
  scrollVert?: boolean;
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export interface IViewLayer {
  build(elem: HTMLElement): void;
  draw(): void;
  eventIsOnCells(e: EventUnion): boolean;
  setTextContent(elem: Node | undefined, text: string): void;
  getBorderWidth(): number;
  _drawCells(): void;
  _buildCells(): void;
  _buildCols(): void;
  _buildRows(): void;
  _drawDecorators(b: boolean): void;
  _drawCellClasses(): void;
}

interface IBuiltElementMap {
  [key: string]: Array<HTMLElement | undefined>;
}

export function create(grid: Grid) {

  let container: HTMLElement | undefined;
  let root: HTMLElement;
  let cellContainerTL: HTMLElement;
  let cellContainerTR: HTMLElement;
  let cellContainerBL: HTMLElement;
  let cellContainerBR: HTMLElement;
  let decoratorContainerTL: HTMLElement;
  let decoratorContainerTR: HTMLElement;
  let decoratorContainerBL: HTMLElement;
  let decoratorContainerBR: HTMLElement;
  let borderWidth: number | undefined;
  let hoveredFixedRow: HTMLElement | undefined;
  let hoveredRow: HTMLElement | undefined;

  const GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';
  const GRID_VIEW_ROOT_CLASS = 'js-grid-view-root';
  const CELL_CLASS = 'grid-cell';

  let cells: HTMLElement[][]; // matrix of rendered cell elements;
  const rows = {
    fixed: [] as HTMLElement[],
    nonFixed: [] as HTMLElement[]
  }; // array of all rendered rows
  // map from col index to an array of built elements for the column to update on scroll
  let builtCols: IBuiltElementMap = {};
  // map from row index to an array of built elements for the row to update on scroll
  let builtRows: IBuiltElementMap = {};

  let drawRequestedId: number | undefined;

  const viewLayer: IViewLayer = {
    build(elem: HTMLElement) {
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
    draw() {
      if (drawRequestedId === undefined) {
        drawRequestedId = requestAnimationFrame(draw);
      }
    },
    eventIsOnCells(e: EventUnion): boolean {
      const target = e.target;

      if (!target) {
        return false;
      }
      if (targetIsElement(target) && target.classList.contains('grid-cell') || target === grid.textarea) {
        // on an actual grid-cell
        return true;
      }

      if (!isAnnotatedEvent(e)) {
        return false;
      }

      const renderedColElement = builtCols && builtCols[e.realCol];
      const renderedRowElement = builtRows && builtRows[e.realRow];

      if (renderedColElement && !grid.view.col.get(e.realCol).isBuiltActionable) {
        const elem = renderedColElement[e.realRow];
        return isTargetInElem(target, elem);
      } else if (renderedRowElement && !grid.view.row.get(e.realRow).isBuiltActionable) {
        const elem = renderedRowElement[e.realCol];
        return isTargetInElem(target, elem);
      }

      return false;
    },
    setTextContent(elem: Node | undefined, text: string) {
      if (!elem) {
        return;
      }
      if (elem.firstChild && elem.firstChild.nodeType === 3) {
        elem.firstChild.nodeValue = text;
      } else {
        elem.textContent = text;
      }
    },
    getBorderWidth,
    _drawCells: drawCells,
    _buildCells: buildCells,
    _buildCols: buildCols,
    _buildRows: buildRows,
    _drawDecorators: drawDecorators,
    _drawCellClasses: drawCellClasses,
  };

  const targetIsElement = (e: EventTarget): e is Element => !!(e as any).classList;

  // add the cell classes through the standard method
  grid.cellClasses.add(grid.cellClasses.create(0, 0, CELL_CLASS, Infinity, Infinity, 'virtual'));

  const rowHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-row-header', Infinity, 0, 'virtual');
  const colHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-col-header', 0, Infinity, 'virtual');
  const fixedColClasses = grid.cellClasses.create(0, -1, 'grid-last-fixed-col', Infinity, 1, 'virtual');
  const fixedRowClasses = grid.cellClasses.create(-1, 0, 'grid-last-fixed-row', 1, Infinity, 'virtual');

  grid.cellClasses.add(rowHeaderClasses);
  grid.cellClasses.add(colHeaderClasses);
  grid.cellClasses.add(fixedRowClasses);
  grid.cellClasses.add(fixedColClasses);

  grid.eventLoop.bind('grid-col-change', () => {
    fixedColClasses.left = grid.colModel.numFixed() - 1;
    rowHeaderClasses.width = grid.colModel.numHeaders();
  });

  grid.eventLoop.bind('grid-row-change', () => {
    fixedRowClasses.top = grid.rowModel.numFixed() - 1;
    colHeaderClasses.height = grid.rowModel.numHeaders();
  });

  grid.eventLoop.bind('grid-cell-mouse-move', (e) => {
    let row = rows.fixed[e.realRow];
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

  function makeCellContainer(): HTMLElement {
    const cellContainer = document.createElement('div');
    cellContainer.setAttribute('dts', 'grid-cells');
    cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
    cellContainer.style.zIndex = '';
    // cellContainer.style.pointerEvents = 'none';
    return cellContainer;
  }

  function makeDecoratorContainer(): HTMLElement {
    const decoratorContainer = document.createElement('div');
    decoratorContainer.setAttribute('dts', 'grid-decorators');
    util.position(decoratorContainer, 0, 0, 0, 0);
    decoratorContainer.style.zIndex = '';
    decoratorContainer.style.pointerEvents = 'none';
    return decoratorContainer;
  }

  function offsetContainerForPixelScroll() {
    const modTopPixels = grid.pixelScrollModel.offsetTop;
    const modLeftPixels = grid.pixelScrollModel.offsetLeft;

    const fixedHeight = grid.virtualPixelCellModel.fixedHeight();
    const fixedWidth = grid.virtualPixelCellModel.fixedWidth();
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
    grid.decorators.getAlive().forEach((decorator: IViewLayerDecorator) => {
      let decoratorTopOffset = 0;
      let decoratorLeftOffset = 0;
      if (decorator.scrollVert && !decorator.scrollHorz) {
        decoratorTopOffset = fixedHeight - modTopPixels;
      } else if (decorator.scrollHorz && !decorator.scrollVert) {
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
    // read the border width, for the rare case of larger than 1px borders, otherwise the draw will default to 1
    if (borderWidth) {
      return;
    }
    const jsGridCell = cells[0] && cells[0][0];
    if (jsGridCell) {
      const oldClass = jsGridCell.className;
      jsGridCell.className = CELL_CLASS;
      const computedStyle = getComputedStyle(jsGridCell);
      const borderWidthProp = computedStyle.getPropertyValue('border-left-width');
      borderWidth = parseInt(borderWidthProp, 10);
      jsGridCell.className = oldClass;
    }
    borderWidth = (!borderWidth || isNaN(borderWidth)) ? undefined : borderWidth;
    return borderWidth;
  }

  function draw() {
    drawRequestedId = undefined;
    // return if we haven't built yet
    if (!container || grid.destroyed) {
      return;
    }

    if (!grid.opts.snapToCell && grid.fps.slowCount > 10) {
      grid.opts.snapToCell = true;
    }

    const rebuilt = grid.viewPort.isDirty();
    if (rebuilt) {
      viewLayer._buildCells();
    }

    const builtColsDirty = grid.colModel.areBuildersDirty();
    if (rebuilt || builtColsDirty) {
      viewLayer._buildCols();
    }

    const builtRowsDirty = grid.rowModel.areBuildersDirty();
    if (rebuilt || builtRowsDirty) {
      viewLayer._buildRows();
    }

    const cellsPositionOrSizeChanged = grid.colModel.isDirty() || grid.rowModel.isDirty() || grid.cellScrollModel.isDirty();

    if (grid.cellClasses.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
      viewLayer._drawCellClasses();
    }

    const drawingCells = rebuilt || cellsPositionOrSizeChanged || builtColsDirty || builtRowsDirty || grid.dataModel.isDirty();
    if (drawingCells) {
      viewLayer._drawCells();
    }

    const drawingDecorators = grid.decorators.isDirty() || rebuilt || cellsPositionOrSizeChanged;
    if (drawingDecorators) {
      viewLayer._drawDecorators(cellsPositionOrSizeChanged || rebuilt);
    }

    if (grid.pixelScrollModel.isOffsetDirty() || drawingDecorators) {
      offsetContainerForPixelScroll();
    }

    grid.eventLoop.fire('grid-draw');
  }

  /* CELL LOGIC */
  function getBorderWidth() {
    return borderWidth || 1;
  }

  function drawCells() {
    measureBorderWidth();
    const bWidth = getBorderWidth();
    const headerRows = grid.rowModel.numHeaders();
    const headerCols = grid.colModel.numHeaders();
    let totalVisibleCellWidth = 0;
    let lastVirtualCol: number | undefined;
    let lastVirtualRow: number | undefined;
    // these get calculated once per col and are then cached to save a factor of numRows calls per column
    const widths: number[] = [];
    const lefts: number[] = [];
    const virtualCols: number[] = [];

    function positionRow(row: HTMLElement, height: number, top: number, virtualRow: number) {
      if (!row) {
        return;
      }
      // seeing the same virtual row twice means we've been clamped and it's time to hide the row
      if (height === 0 || lastVirtualRow === virtualRow) {
        row.style.display = 'none';
        return;
      }
      row.style.display = '';
      row.style.height = height + bWidth + 'px';
      row.style.top = top + 'px';
    }

    grid.viewPort.iterateCells(function drawCell(r: number, c: number) {
      const cell = cells[r][c];
      // only calculate these once per column since they can't change during draw
      const width = widths[c] || (widths[c] = grid.viewPort.getColWidth(c));
      const virtualCol = virtualCols[c] || (virtualCols[c] = grid.viewPort.toVirtualCol(c));
      // if we got the same vCol we've been clamped and its time to hide this cell
      // also hide the cell if its width is zero cause ya...
      if (width === 0 || virtualCol === lastVirtualCol) {
        cell.style.display = 'none';
        return;
      }
      if (r === 0) {
        // calculate width for rows later but only do it one time (so on the first row)
        totalVisibleCellWidth += width;
      }

      lastVirtualCol = virtualCol;
      cell.style.display = '';
      cell.style.width = width + bWidth + 'px';
      // only calculate these once per column since they can't change during draw
      const left = lefts[c] || (lefts[c] = grid.viewPort.getColLeft(c));

      cell.style.left = left + 'px';

      const virtualRow = grid.viewPort.toVirtualRow(r);

      const data = (r < headerRows || c < headerCols) ?
        grid.dataModel.getHeader(virtualRow, virtualCol) :
        grid.dataModel.get(grid.rowModel.toData(virtualRow), grid.colModel.toData(virtualCol));

      // artificially only get builders for row headers for now
      let builder = grid.rowModel.get(virtualRow).builder;
      let hasRowBuilder = true;
      if (!builder || (virtualCol < headerCols && !builder.includeHeaders)) {
        hasRowBuilder = false;
        builder = grid.colModel.get(virtualCol).builder;
        if (builder && virtualRow < headerRows && !builder.includeHeaders) {
          builder = undefined;
        }
      }

      let cellChild;
      if (builder) {
        const builtElem = (hasRowBuilder) ?
          builtRows[virtualRow][c] :
          builtCols[virtualCol][r];

        cellChild = builder.update(builtElem, {
          virtualCol,
          virtualRow,
          data
        });
      }

      // if we didn't get a child from the builder use a regular text node
      if (!cellChild) {
        viewLayer.setTextContent(cell, data.formatted);
      } else {
        const notSameElem = cell.firstChild !== cellChild;
        if (cell.firstChild && notSameElem) {
          cell.removeChild(cell.firstChild);
        }
        if (notSameElem) {
          cell.appendChild(cellChild);
        }

      }
    }, function drawRow(r: number) {
      const height = grid.viewPort.getRowHeight(r);
      const virtualRow = grid.view.row.toVirtual(r);
      const top = grid.viewPort.getRowTop(r);
      positionRow(rows.fixed[r], height, top, virtualRow);
      positionRow(rows.nonFixed[r], height, top, virtualRow);
      lastVirtualRow = virtualRow;
      lastVirtualCol = undefined;
    });

    rows.nonFixed.forEach((row) => {
      row.style.width = totalVisibleCellWidth + 'px';
    });
    rows.fixed.forEach((row) => {
      row.style.width = grid.virtualPixelCellModel.fixedWidth() + 'px';
    });

    if (grid.cellScrollModel.row % 2) {
      cellContainerBR.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
      cellContainerBL.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
    } else {
      doToAllCellContainers((cellContainer) => {
        cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
      });

    }
  }

  function clearCellContainer(cellContainer: HTMLElement) {
    while (cellContainer.firstChild) {
      cellContainer.removeChild(cellContainer.firstChild);
    }
  }

  function doToAllCellContainers(fn: (container: HTMLElement) => void) {
    fn(cellContainerTL);
    fn(cellContainerTR);
    fn(cellContainerBL);
    fn(cellContainerBR);
  }

  function getCellContainer(r: number, c: number) {
    const fixedRow = r < grid.rowModel.numFixed();
    const fixedCol = c < grid.colModel.numFixed();
    if (fixedRow && fixedCol) {
      return cellContainerTL;
    } else if (fixedRow) {
      return cellContainerTR;
    } else if (fixedCol) {
      return cellContainerBL;
    }
    return cellContainerBR;
  }

  function buildRow(r: number) {
    const row = document.createElement('div');
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
    let row: HTMLElement;
    grid.viewPort.iterateCells((r, c) => {
      if (c === 0) {
        cells[r] = [];
      }
      if (c === grid.colModel.numFixed()) {
        row = rows.nonFixed[r] = buildRow(r);
      } else if (c === 0) {
        row = rows.fixed[r] = buildRow(r);
      }
      const cell = buildDivCell();
      cells[r][c] = cell;
      row.appendChild(cell);
      getCellContainer(r, c).appendChild(row);
    });
  }

  function buildDivCell() {
    const cell = document.createElement('div');
    cell.setAttribute('dts', 'grid-cell');
    const style = cell.style;
    style.position = 'absolute';
    style.boxSizing = 'border-box';
    style.top = '0px';
    style.bottom = '0px';
    return cell;
  }

  /* END CELL LOGIC */

  /* COL BUILDER LOGIC */

  function destroyRenderedElems(oldElems?: Array<HTMLElement | undefined>) {
    if (!oldElems) {
      return;
    }
    oldElems.forEach((oldElem) => {
      if (!oldElem) {
        return;
      }
      const destroyEvent = customEvent('grid-rendered-elem-destroy', true);
      oldElem.dispatchEvent(destroyEvent);
    });
  }

  function buildCols() {
    builtCols = buildDimension(grid.cols, grid.rows, builtCols, (viewCol, viewRow, previousElement) => ({
      viewRow,
      viewCol,
      previousElement
    }));
  }
  /* END COL BUILDER LOGIC */

  /* ROW BUILDER LOGIC
   *  for now we only build headers
   * */

  function buildRows() {
    builtRows = buildDimension(grid.rows, grid.cols, builtRows, (viewRow, viewCol, previousElement) => ({
      viewRow,
      viewCol,
      previousElement
    }));
  }

  function buildDimension(
    dimension: IGridDimension,
    crossDimension: IGridDimension,
    previouslyBuiltElems: IBuiltElementMap | undefined,
    getRenderContext: (dimPos: number, crossDimPos: number, elem: HTMLElement | undefined) => IBuilderRenderContext,
  ) {
    const builtElems: IBuiltElementMap = {};
    for (let i = 0; i < dimension.rowColModel.length(true); i++) {
      const builder = dimension.rowColModel.get(i).builder;
      const oldElems = previouslyBuiltElems && previouslyBuiltElems[i];

      if (builder) {
        builtElems[i] = [];
        destroyRenderedElems(oldElems);
        for (let realI = 0; realI < crossDimension.viewPort.count; realI++) {
          builtElems[i][realI] = builder.render(
            getRenderContext(dimension.converters.virtual.toView(i), realI, oldElems && oldElems[realI])
          );
        }
      }
    }
    return builtElems;
  }
  /* END ROW BUILDER LOGIC*/

  /* DECORATOR LOGIC */
  function setPosition(boundingBox: HTMLElement, top: number, left: number, height: number, width: number): false | void {
    const style = boundingBox.style;
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

  function positionDecorator(bounding: HTMLElement, t: number, l: number, h: number, w: number) {
    return setPosition(bounding, t, l, util.clamp(h, 0, grid.viewPort.height), util.clamp(w, 0, grid.viewPort.width));
  }

  function positionCellDecoratorFromViewCellRange(realCellRange: RawPositionRange, boundingBox: HTMLElement) {
    const realPxRange = grid.viewPort.toPx(realCellRange);
    return positionDecorator(
      boundingBox,
      realPxRange.top,
      realPxRange.left,
      realPxRange.height && realPxRange.height + getBorderWidth(),
      realPxRange.width && realPxRange.width + getBorderWidth()
    );
  }

  function createRangeForDescriptor(descriptor: IViewLayerDecorator) {
    const range = {
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

  function drawDecorators(cellsPositionOrSizeChanged: boolean) {
    const aliveDecorators = grid.decorators.getAlive();
    aliveDecorators.forEach((decorator: IViewLayerDecorator) => {

      const hasBeenRendered = !!decorator.boundingBox;
      const boundingBox = decorator.boundingBox || document.createElement('div');
      if (!hasBeenRendered) {
        boundingBox.style.pointerEvents = 'none';
        decorator.boundingBox = boundingBox;
        const decElement = decorator.render();
        if (decElement) {
          boundingBox.appendChild(decElement);
        }
      }

      if (decorator.isDirty() || cellsPositionOrSizeChanged || !hasBeenRendered) {

        let vCol = decorator.left;
        let vRow = decorator.top;
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
        } else if (decorator.space === 'virtual' || decorator.space === 'data') {
          if (decorator.space === 'data') {
            vCol = grid.data.col.toVirtual(vCol);
            vRow = grid.data.row.toVirtual(vRow);
          }
          switch (decorator.units) {
            case 'px':
              break;
            case 'cell':
            /* jshint -W086 */
            default:
              const range = createRangeForDescriptor(decorator);
              const realCellRange = grid.viewPort.intersect(range);
              if (realCellRange) {
                positionCellDecoratorFromViewCellRange(realCellRange, boundingBox);
              } else {
                positionDecorator(boundingBox, -1, -1, -1, -1);
              }
              break;
            /* jshint +W086 */
          }
        }

        const parent = boundingBox.parentElement;
        if (parent) {
          parent.removeChild(boundingBox);
        }
        const fixedRow = vRow < grid.rowModel.numFixed();
        const fixedCol = vCol < grid.colModel.numFixed();
        if (fixedRow && fixedCol) {
          decorator.scrollHorz = false;
          decorator.scrollVert = false;
          decoratorContainerTL.appendChild(boundingBox);
        } else if (fixedRow) {
          decorator.scrollHorz = true;
          decorator.scrollVert = false;
          decoratorContainerTR.appendChild(boundingBox);
        } else if (fixedCol) {
          decorator.scrollHorz = false;
          decorator.scrollVert = true;
          decoratorContainerBL.appendChild(boundingBox);
        } else {
          decorator.scrollHorz = true;
          decorator.scrollVert = true;
          decoratorContainerBR.appendChild(boundingBox);
        }
      }
    });

    removeDecorators(grid.decorators.popAllDead());
  }

  function removeDecorators(decorators: IDecorator[]) {
    decorators.forEach((decorator) => {
      if (!decorator) {
        return;
      }
      const boundingBox = decorator.boundingBox;
      if (boundingBox) {
        // if they rendered an element previously we attached it to the bounding box as the only child
        const renderedElement = boundingBox.firstChild;
        if (renderedElement) {
          // create a destroy dom event that bubbles
          const destroyEvent = customEvent('decorator-destroy', true);
          renderedElement.dispatchEvent(destroyEvent);
        }
        const parent = boundingBox.parentElement;
        if (parent) {
          parent.removeChild(boundingBox);
        }
        decorator.boundingBox = undefined;
      }
    });
  }

  /* END DECORATOR LOGIC */

  /* CELL CLASSES LOGIC */
  function drawCellClasses() {
    grid.viewPort.iterateCells((r, c) => {
      const classes = grid.cellClasses.getCachedClasses(grid.view.row.toVirtual(r), grid.view.col.toVirtual(c));
      cells[r][c].className = classes.join(' ');
    });
  }

  /* END CELL CLASSES LOGIC*/

  function destroyPreviouslyBuilt(built: IBuiltElementMap) {
    if (!built) {
      return;
    }
    Object.keys(built).forEach((key) => {
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
    const gridViewRoots = container.querySelectorAll('.' + GRID_VIEW_ROOT_CLASS);
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < gridViewRoots.length; ++i) {
      container.removeChild(gridViewRoots[i]);
    }
  }

  function isTargetInElem(target: EventTarget | undefined, elem: HTMLElement | undefined) {
    if (!target || !targetIsElement(target)) {
      return false;
    }
    let t: Element | null = target;
    while (t && !t.classList.contains('grid-container')) {
      if (t === elem) {
        return true;
      }
      t = t.parentElement;
    }
    return false;
  }

  grid.eventLoop.bind('grid-destroy', () => {
    cleanup();
    if (drawRequestedId) {
      cancelAnimationFrame(drawRequestedId);
    }
    viewLayer.draw = () => { /* noop */ };
  });

  return viewLayer;
}

export default create;