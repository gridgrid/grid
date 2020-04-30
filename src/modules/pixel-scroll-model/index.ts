import { Grid, IGridDimension } from '../core';
import { IDecorator } from '../decorators';
import makeDirtyClean from '../dirty-clean';
import { IGridCustomMouseEvent } from '../event-loop';
import * as util from '../util';

export interface IPixelScrollModel {
  x: IPixelScrollDimensionInfo;
  y: IPixelScrollDimensionInfo;
  top: number;
  left: number;
  height: number;
  width: number;
  offsetTop: number;
  offsetLeft: number;
  vertScrollBar: IScrollBarDecorator;
  horzScrollBar: IScrollBarDecorator;
  maxScroll: {
    height?: number,
    width?: number
  };
  maxIsAllTheWayFor: {
    height: boolean,
    width: boolean
  };
  isDirty(): boolean;
  isOffsetDirty(): boolean;
  scrollTo(x: number, y: number, dontNotify?: boolean): void;
  setScrollSize(h: number, w: number): void;
  _getMaxScroll(heightOrWidth: 'height' | 'width'): number;
}

export interface IScrollBarDecorator extends IDecorator {
  _onDragStart?(e: IGridCustomMouseEvent): void;
  _unbindDrag?(): void;
  _unbindDragEnd?(): void;
}

export interface IPixelScrollDimensionInfo {
  position: number;
  offset: number;
  scrollSize: number;
  maxScroll: number;
  maxIsAllTheWay: boolean;
  scrollBar: IScrollBarDecorator;
  scrollTo(px: number, dontNotify?: boolean): void;
  positionScrollBar(): void;
  updatePixelOffset(): void;
  calcCellScrollPosition(): number;
  sizeScrollBar(): void;
  cacheMaxScroll(): void;
  cacheScrollSize(): void;
  _getMaxScroll(): number;
}

export function create(grid: Grid) {
  const pixelDirtyClean = makeDirtyClean(grid);
  const offsetDirtyClean = makeDirtyClean(grid);
  const scrollBarWidth = 10;
  const intentionAngle = 30;

  function makeDimension(
    gridDimension: IGridDimension,
    gridCrossDimension: IGridDimension,
  ) {

    function getViewScrollSize() {
      return gridDimension.viewPort.size - gridDimension.virtualPixelCell.fixedSize();
    }

    function getScrollRatioFromVirtualScrollCoords(scroll: number) {
      const maxScroll = pixelScrollDimension.maxScroll;
      const scrollRatio = scroll / maxScroll;
      return scrollRatio;
    }

    function getRealScrollBarPosition(scroll: number) {
      const scrollRatio = getScrollRatioFromVirtualScrollCoords(scroll);
      const maxScrollBarScroll = getMaxScrollBarCoord();
      // in scroll bar coords
      const scrollBarCoord = scrollRatio * maxScrollBarScroll;
      // add the fixed height to translate back into real coords
      return scrollBarCoord + gridDimension.virtualPixelCell.fixedSize();
    }

    function getMaxScroll() {
      if (pixelScrollDimension.maxIsAllTheWay) {
        return Math.max(
          0,
          pixelScrollDimension.scrollSize - gridDimension.virtualPixelCell.sizeOf(gridDimension.rowColModel.length(true) - 1)
        );
      }

      let scrollLength = pixelScrollDimension.scrollSize;
      const viewScrollSize = getViewScrollSize();

      if (scrollLength <= viewScrollSize) {
        return 0;
      }

      let firstScrollableCell = gridDimension.rowColModel.numFixed();
      while (scrollLength > viewScrollSize - 10 && firstScrollableCell < gridDimension.rowColModel.length(true)) {
        scrollLength -= gridDimension.virtualPixelCell.sizeOf(firstScrollableCell);
        firstScrollableCell++;
      }
      return pixelScrollDimension.scrollSize - scrollLength;
    }

    function getMaxScrollBarCoord() {
      return getViewScrollSize() - (gridDimension.positionRange.getSize(pixelScrollDimension.scrollBar) || scrollBarWidth);
    }

    function getScrollPositionFromReal(scrollBarRealClickCoord: number) {
      const scrollBarTopClick = scrollBarRealClickCoord - gridDimension.virtualPixelCell.fixedSize();
      const scrollRatio = scrollBarTopClick / getMaxScrollBarCoord();
      const scrollCoord = scrollRatio * pixelScrollDimension.maxScroll;
      return scrollCoord;
    }

    function makeScrollBarDecorator() {
      const decorator: IScrollBarDecorator = grid.decorators.create();
      decorator.fixed = true;
      const viewPortClampFn = gridDimension.viewPort.clampPx;

      decorator.postRender = (scrollBarElem: HTMLElement) => {
        scrollBarElem.setAttribute('class', 'grid-scroll-bar');
        scrollBarElem.setAttribute('style', `${scrollBarElem.getAttribute('style')} border-radius: 6px;
                background: rgba(0, 0, 0, .5);
                z-index: 10;`);
        decorator._onDragStart = (e) => {
          if (e.target !== scrollBarElem) {
            return;
          }
          const scrollBarOffset = gridDimension.cellMouse.layerPx(e);

          decorator._unbindDrag = grid.eventLoop.bind('grid-drag', (gridDragEvent: IGridCustomMouseEvent) => {
            grid.eventLoop.stopBubbling(gridDragEvent);
            const gridCoord = viewPortClampFn(gridDimension.cellMouse.gridPx(gridDragEvent));
            const scrollBarRealClickCoord = gridCoord - scrollBarOffset;
            const scrollCoord = getScrollPositionFromReal(scrollBarRealClickCoord);
            pixelScrollDimension.scrollTo(scrollCoord);
          });

          decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', () => {
            if (decorator._unbindDrag) {
              decorator._unbindDrag();
            }
            if (decorator._unbindDragEnd) {
              decorator._unbindDragEnd();
            }
          });

          e.stopPropagation();
        };

        grid.eventLoop.bind(scrollBarElem, 'grid-drag-start', decorator._onDragStart);
        grid.eventLoop.bind(scrollBarElem, 'mousedown', (e) => {
          grid.eventLoop.stopBubbling(e);
        });

        return scrollBarElem;
      };

      decorator.units = 'px';
      decorator.space = 'real';
      gridCrossDimension.positionRange.setSize(decorator, scrollBarWidth);
      return decorator;
    }

    const pixelScrollDimension: IPixelScrollDimensionInfo = {
      position: 0,
      offset: 0,
      maxScroll: 0,
      scrollSize: 0,
      maxIsAllTheWay: false,
      scrollTo(px: number, dontNotify?: boolean) {
        pixelScrollDimension.position = util.clamp(px, 0, pixelScrollDimension.maxScroll);
        pixelScrollDimension.positionScrollBar();
        pixelScrollDimension.updatePixelOffset();

        if (!dontNotify) {
          notifyListeners();
        }
      },
      updatePixelOffset() {
        let modPixels = 0;
        if (!grid.opts.snapToCell) {
          const fixedSize = gridDimension.virtualPixelCell.fixedSize();
          const rawCell = gridDimension.virtualPixelCell.toCellFromPx(pixelScrollDimension.position + fixedSize);
          const cell = rawCell - gridDimension.rowColModel.numFixed();
          const startCell = gridDimension.rowColModel.numFixed();
          const endCell = cell + gridDimension.rowColModel.numFixed() - 1;
          const position = gridDimension.virtualPixelCell.sizeOf(startCell, endCell);
          modPixels = position - pixelScrollDimension.position;
        }
        if (pixelScrollDimension.offset !== modPixels) {
          offsetDirtyClean.setDirty();
        }
        pixelScrollDimension.offset = modPixels;
      },
      scrollBar: makeScrollBarDecorator(),
      positionScrollBar() {
        gridDimension.positionRange.setPosition(
          pixelScrollDimension.scrollBar,
          getRealScrollBarPosition(pixelScrollDimension.position)
        );
      },
      calcCellScrollPosition() {
        const position = pixelScrollDimension.position;
        const rawCell = gridDimension.virtualPixelCell.toCellFromPx(
          position + gridDimension.virtualPixelCell.fixedSize()
        );
        return rawCell - gridDimension.rowColModel.numFixed();
      },
      sizeScrollBar() {

        // viewport.size needs to be cross size
        gridCrossDimension.positionRange.setPosition(
          pixelScrollDimension.scrollBar,
          gridCrossDimension.viewPort.size - scrollBarWidth
        );
        const scrollableViewSize = getViewScrollSize();
        const scrollBarSize = Math.max(scrollableViewSize / gridDimension.virtualPixelCell.totalSize() * scrollableViewSize, 20);
        gridDimension.positionRange.setSize(
          pixelScrollDimension.scrollBar,
          scrollBarSize
        );
        if (scrollBarSize >= scrollableViewSize) {
          gridDimension.positionRange.setSize(
            pixelScrollDimension.scrollBar,
            -1
          );
        }
      },
      cacheMaxScroll() {
        pixelScrollDimension.maxScroll = getMaxScroll();
      },
      cacheScrollSize() {
        pixelScrollDimension.scrollSize = gridDimension.virtualPixelCell.totalSize() - gridDimension.virtualPixelCell.fixedSize();
      },
      _getMaxScroll: getMaxScroll
    };
    return pixelScrollDimension;
  }

  const dimensions = {
    y: makeDimension(grid.rows, grid.cols),
    x: makeDimension(grid.cols, grid.rows),
  };
  const model: IPixelScrollModel = {
    get height() {
      return dimensions.y.scrollSize;
    },
    get width() {
      return dimensions.x.scrollSize;
    },
    get top() {
      return dimensions.y.position;
    },
    get left() {
      return dimensions.x.position;
    },
    get offsetTop() {
      return dimensions.y.offset;
    },
    get offsetLeft() {
      return dimensions.x.offset;
    },
    get vertScrollBar() {
      return dimensions.y.scrollBar;
    },
    get horzScrollBar() {
      return dimensions.x.scrollBar;
    },
    maxScroll: {
      get height() {
        return dimensions.y.scrollSize;
      },
      get width() {
        return dimensions.x.scrollSize;
      }
    },
    maxIsAllTheWayFor: {
      get height() {
        return dimensions.y.maxIsAllTheWay;
      },
      set height(h: boolean) {
        dimensions.y.maxIsAllTheWay = h;
      },
      get width() {
        return dimensions.x.maxIsAllTheWay;
      },
      set width(h: boolean) {
        dimensions.x.maxIsAllTheWay = h;
      },
    },
    isDirty: pixelDirtyClean.isDirty,
    isOffsetDirty: offsetDirtyClean.isDirty,
    setScrollSize(h: number, w: number) {
      model.y.scrollSize = h;
      model.x.scrollSize = w;
    },
    scrollTo(top: number, left: number, dontNotify?: boolean) {
      model.y.scrollTo(top, true);
      model.x.scrollTo(left, true);
      if (!dontNotify) {
        notifyListeners();
      }

    },
    _getMaxScroll(heightOrWidth: 'height' | 'width') {
      const dimension = heightOrWidth === 'height' ? model.y : model.x;
      return dimension._getMaxScroll();
    },
    y: dimensions.y,
    x: dimensions.x,
  };

  grid.eventLoop.bind('grid-virtual-pixel-cell-change', () => {
    model.y.cacheScrollSize();
    model.x.cacheScrollSize();
    cacheMaxScroll();
    sizeScrollBars();
    updatePixelOffsets();
  });

  grid.eventLoop.bind('grid-viewport-change', () => {
    cacheMaxScroll();
    sizeScrollBars();
    updatePixelOffsets();
  });

  function cacheMaxScroll() {
    model.y.cacheMaxScroll();
    model.x.cacheMaxScroll();
  }

  function checkAngle(side1: number, side2: number) {
    const angle = Math.abs(Math.atan(side1 / side2) * 57.29);
    return angle < intentionAngle;
  }

  // assumes a standardized wheel event that we create through the mousewheel package
  grid.eventLoop.bind('mousewheel', (e: MouseWheelEvent) => {
    if (e.target !== grid.container && getScrollElementFromTarget(e.target, grid.container) !== grid.container) {
      return;
    }

    let deltaY = e.deltaY;
    let deltaX = e.deltaX;
    if (checkAngle(deltaY, deltaX)) {
      deltaY = 0;
    } else if (checkAngle(deltaX, deltaY)) {
      deltaX = 0;
    }

    model.scrollTo(model.top - deltaY, model.left - deltaX, false);
    e.preventDefault();
  });

  function notifyListeners() {
    // TODO: possibly keep track of delta since last update and send it along. for now, no
    grid.eventLoop.fire('grid-pixel-scroll');

    // update the cell scroll
    grid.cellScrollModel.scrollTo(model.y.calcCellScrollPosition(), model.x.calcCellScrollPosition(), undefined, true);
    pixelDirtyClean.setDirty();
  }

  /* SCROLL BAR LOGIC */

  function sizeScrollBars() {
    model.y.sizeScrollBar();
    model.x.sizeScrollBar();
    positionScrollBars();
  }

  function positionScrollBars() {
    model.y.positionScrollBar();
    model.x.positionScrollBar();
  }

  function updatePixelOffsets() {
    model.y.updatePixelOffset();
    model.x.updatePixelOffset();
  }

  grid.decorators.add(model.y.scrollBar);
  grid.decorators.add(model.x.scrollBar);
  /* END SCROLL BAR LOGIC */

  const hasStyle = (elem: EventTarget): elem is HTMLElement => !!(elem as any).style;

  function getScrollElementFromTarget(elem: EventTarget | null, stopParent?: HTMLElement | Document) {
    stopParent = stopParent || document;
    if (!elem || !(hasStyle(elem))) {
      return stopParent;
    }

    const position = elem.style.position;
    const excludeStaticParent = position === 'absolute';
    const overflowRegex = /(auto|scroll)/;
    let scrollParent: HTMLElement | null = elem;

    while (!!scrollParent && scrollParent !== stopParent) {
      if (!(excludeStaticParent && scrollParent.style.position === 'static')) {
        const computedStyle = getComputedStyle(scrollParent);

        if (overflowRegex.test('' + computedStyle.overflow + computedStyle.overflowY + computedStyle.overflowX)) {
          break;
        }
      }

      scrollParent = scrollParent.parentElement;
    }

    return position === 'fixed' || !scrollParent || scrollParent === elem ? elem.ownerDocument || stopParent : scrollParent;
  }

  return model;
}

export default create;