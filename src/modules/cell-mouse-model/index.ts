import { Grid } from '../core';
import customEvent from '../custom-event';
import {
  AnnotatedMouseEventUnion,
  EventUnion,
  GridCustomMouseEventTypes,
  IAnnotatedEvent,
  IAnnotatedMouseEvent,
  IGridCustomMouseEvent,
  IGridDragStartEvent,
  ILoopEvent,
  isAnnotatedMouseEvent,
  isAnnotatedMouseEventOfType,
} from '../event-loop';

const PROPS_TO_COPY_FROM_MOUSE_EVENTS: Array<keyof AnnotatedMouseEventUnion | 'layerX' | 'layerY'> = [
  'clientX',
  'clientY',
  'gridX',
  'gridY',
  'layerX',
  'layerY',
  'row',
  'col',
  'realRow',
  'realCol',
  'virtualRow',
  'virtualCol',
];

export interface IEventDimensionInfoGetter {
  view(e: IAnnotatedEvent): number;
  virtual(e: IAnnotatedEvent): number;
  data(e: IAnnotatedEvent): number;
  gridPx(e: IAnnotatedMouseEvent): number;
  layerPx(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent): number;
}

export interface ICellMouseModel {
  rowInfo: IEventDimensionInfoGetter;
  colInfo: IEventDimensionInfoGetter;
  _annotateEvent(e: EventUnion): void;
  _annotateEventInternal(e: AnnotatedMouseEventUnion): void;
  _annotateEventFromViewCoords(e: AnnotatedMouseEventUnion, viewRow: number, viewCol: number): EventUnion;
}

export function create(grid: Grid) {
  let scrollInterval: number | undefined;
  let lastMoveRow: number | undefined;
  let lastMoveCol: number | undefined;
  const model: ICellMouseModel = {
    rowInfo: {
      view(e: IAnnotatedEvent) {
        return e.realRow;
      },
      virtual(e: IAnnotatedEvent) {
        return e.virtualRow;
      },
      data(e: IAnnotatedEvent) {
        return e.row;
      },
      gridPx(e: IAnnotatedMouseEvent) {
        return e.gridY;
      },
      layerPx(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent) {
        return (e as any).layerY;
      },
    },
    colInfo: {
      view(e: IAnnotatedEvent) {
        return e.realCol;
      },
      virtual(e: IAnnotatedEvent) {
        return e.virtualCol;
      },
      data(e: IAnnotatedEvent) {
        return e.col;
      },
      gridPx(e: IAnnotatedMouseEvent) {
        return e.gridX;
      },
      layerPx(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent) {
        return (e as any).layerX;
      },
    },
    _annotateEvent(e: EventUnion) {
      if (isAnnotatedMouseEvent(e)) {
        model._annotateEventInternal(e);
      }
    },
    _annotateEventFromViewCoords(e: AnnotatedMouseEventUnion, viewRow: number, viewCol: number) {
      e.realRow = viewRow;
      e.realCol = viewCol;
      e.virtualRow = grid.view.row.toVirtual(e.realRow);
      e.virtualCol = grid.view.col.toVirtual(e.realCol);
      e.row = grid.virtual.row.toData(e.virtualRow);
      e.col = grid.virtual.col.toData(e.virtualCol);
      return e;
    },
    _annotateEventInternal(e: AnnotatedMouseEventUnion) {
      const y = grid.viewPort.toGridY(e.clientY);
      const x = grid.viewPort.toGridX(e.clientX);
      const viewRow = grid.rows.viewPort.toViewFromPx(y);
      const viewCol = grid.cols.viewPort.toViewFromPx(x);
      model._annotateEventFromViewCoords(e, viewRow, viewCol);
      e.gridX = x;
      e.gridY = y;
    },
  };

  grid.eventLoop.addInterceptor((e: EventUnion) => {
    model._annotateEvent(e);
    if (isAnnotatedMouseEventOfType(e, 'mousedown')) {
      if (e.currentTarget === grid.container) {
        setupDragEventForMouseDown(e);
      }
    } else if (isAnnotatedMouseEventOfType(e, 'mousemove')) {
      if (e.row !== lastMoveRow || e.col !== lastMoveCol) {
        createAndFireCustomMouseEvent('grid-cell-mouse-move', e);
        lastMoveRow = e.row;
        lastMoveCol = e.col;
      }
    }
  });

  function calculateColScrollDiff(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent) {
    let colDiff = 0;
    if (e.clientX > ((grid.container && grid.container.getBoundingClientRect().right) || window.innerWidth)) {
      colDiff = 1;
    } else if (grid.viewPort.toGridX(e.clientX) < grid.virtualPixelCellModel.fixedWidth()) {
      colDiff = -1;
    }
    return colDiff;
  }

  function calculateRowScrollDiff(e: AnnotatedMouseEventUnion | IGridCustomMouseEvent) {
    let rowDiff = 0;
    if (e.clientY > ((grid.container && grid.container.getBoundingClientRect().bottom) || window.innerHeight)) {
      rowDiff = 1;
    } else if (grid.viewPort.toGridY(e.clientY) < grid.virtualPixelCellModel.fixedHeight()) {
      rowDiff = -1;
    }
    return rowDiff;
  }

  function setupDragEventForMouseDown(downEvent: AnnotatedMouseEventUnion) {
    let lastDragRow = downEvent.row;
    let lastDragCol = downEvent.col;
    let dragStarted = false;
    let unbindAutoScrollDrag: (() => void) | undefined;
    const lastX = downEvent.clientX;
    const lastY = downEvent.clientY;
    const unbindMove = grid.eventLoop.bind(window, 'mousemove', (mousemoveEvent) => {
      if (dragStarted && !mousemoveEvent.which) {
        // got a move event without mouse down which means we somehow missed the mouseup
        handleMouseUp(mousemoveEvent);
        return;
      }

      if (!dragStarted) {
        if (lastX === mousemoveEvent.clientX && lastY === mousemoveEvent.clientY) {
          console.warn(
            'Got a mouse move event with ',
            mousemoveEvent.clientX,
            ',',
            mousemoveEvent.clientY,
            ' when the last position was ',
            lastX,
            ',',
            lastY,
          );
        }
        createAndFireCustomMouseEvent('grid-drag-start', downEvent, (dragStart: IGridDragStartEvent) => {
          let onlyFixedRows = !calculateRowScrollDiff(mousemoveEvent);
          let onlyFixedCols = !calculateColScrollDiff(mousemoveEvent);
          dragStart.enableAutoScroll = () => {
            if (unbindAutoScrollDrag) {
              unbindAutoScrollDrag();
            }
            unbindAutoScrollDrag = grid.eventLoop.bind('grid-drag', (gridDragEvent) => {
              // if it gets here then we will try to auto scroll
              const newRowDiff = calculateRowScrollDiff(gridDragEvent);
              onlyFixedRows = !newRowDiff;
              const rowDiff = onlyFixedRows ? 0 : newRowDiff;

              const newColDiff = calculateColScrollDiff;
              onlyFixedCols = !newColDiff;
              const colDiff = onlyFixedCols ? 0 : newColDiff(gridDragEvent);

              if (scrollInterval != undefined) {
                clearInterval(scrollInterval);
              }
              if (rowDiff || colDiff) {
                scrollInterval = grid.interval(() => {
                  grid.cellScrollModel.scrollTo(grid.cellScrollModel.row + rowDiff, grid.cellScrollModel.col + colDiff);
                }, 100);
              }
            });
          };
        });
        dragStarted = true;
      }

      createAndFireCustomMouseEvent('grid-drag', mousemoveEvent);

      if (mousemoveEvent.row !== lastDragRow || mousemoveEvent.col !== lastDragCol) {
        createAndFireCustomMouseEvent('grid-cell-drag', mousemoveEvent);

        lastDragRow = mousemoveEvent.row;
        lastDragCol = mousemoveEvent.col;
      }
    });

    const unbindUp = grid.eventLoop.bind(window, 'mouseup', handleMouseUp);

    function handleMouseUp(e: AnnotatedMouseEventUnion) {
      if (scrollInterval != undefined) {
        clearInterval(scrollInterval);
      }
      unbindMove();
      unbindUp();
      if (unbindAutoScrollDrag) {
        unbindAutoScrollDrag();
      }

      const dragEnd = createCustomEventFromMouseEvent('grid-drag-end', e);

      // row, col, x, and y should inherit
      grid.eventLoop.fire(dragEnd);
    }
  }

  function createCustomEventFromMouseEvent(type: GridCustomMouseEventTypes, e: AnnotatedMouseEventUnion) {
    const event = customEvent(type, true, true) as IGridCustomMouseEvent;
    PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach((prop: keyof AnnotatedMouseEventUnion) => {
      (event as any)[prop] = e[prop];
    });
    event.originalEvent = e;
    return event;
  }

  function createAndFireCustomMouseEvent(
    type: GridCustomMouseEventTypes,
    e: AnnotatedMouseEventUnion,
    annotateEvent?: (e: ILoopEvent) => any,
  ) {
    let drag = createCustomEventFromMouseEvent(type, e);
    if (annotateEvent) {
      drag = annotateEvent(drag) || drag;
    }
    if (e.target) {
      e.target.dispatchEvent(drag);
    } else {
      grid.eventLoop.fire(drag);
    }
    return drag;
  }

  return model;
}

export default create;

