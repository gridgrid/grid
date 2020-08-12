"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var custom_event_1 = require("../custom-event");
var event_loop_1 = require("../event-loop");
var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'gridX', 'gridY', 'layerX', 'layerY', 'row', 'col', 'realRow', 'realCol', 'virtualRow', 'virtualCol'];
function create(grid) {
    var scrollInterval;
    var lastMoveRow;
    var lastMoveCol;
    var model = {
        rowInfo: {
            view: function (e) {
                return e.realRow;
            },
            virtual: function (e) {
                return e.virtualRow;
            },
            data: function (e) {
                return e.row;
            },
            gridPx: function (e) {
                return e.gridY;
            },
            layerPx: function (e) {
                return e.layerY;
            }
        },
        colInfo: {
            view: function (e) {
                return e.realCol;
            },
            virtual: function (e) {
                return e.virtualCol;
            },
            data: function (e) {
                return e.col;
            },
            gridPx: function (e) {
                return e.gridX;
            },
            layerPx: function (e) {
                return e.layerX;
            }
        },
        _annotateEvent: function (e) {
            if (event_loop_1.isAnnotatedMouseEvent(e)) {
                model._annotateEventInternal(e);
            }
        },
        _annotateEventFromViewCoords: function (e, viewRow, viewCol) {
            e.realRow = viewRow;
            e.realCol = viewCol;
            e.virtualRow = grid.view.row.toVirtual(e.realRow);
            e.virtualCol = grid.view.col.toVirtual(e.realCol);
            e.row = grid.virtual.row.toData(e.virtualRow);
            e.col = grid.virtual.col.toData(e.virtualCol);
            return e;
        },
        _annotateEventInternal: function (e) {
            var y = grid.viewPort.toGridY(e.clientY);
            var x = grid.viewPort.toGridX(e.clientX);
            var viewRow = grid.rows.viewPort.toViewFromPx(y);
            var viewCol = grid.cols.viewPort.toViewFromPx(x);
            model._annotateEventFromViewCoords(e, viewRow, viewCol);
            e.gridX = x;
            e.gridY = y;
        },
    };
    grid.eventLoop.addInterceptor(function (e) {
        model._annotateEvent(e);
        if (event_loop_1.isAnnotatedMouseEventOfType(e, 'mousedown')) {
            if (e.currentTarget === grid.container) {
                setupDragEventForMouseDown(e);
            }
        }
        else if (event_loop_1.isAnnotatedMouseEventOfType(e, 'mousemove')) {
            if (e.row !== lastMoveRow || e.col !== lastMoveCol) {
                createAndFireCustomMouseEvent('grid-cell-mouse-move', e);
                lastMoveRow = e.row;
                lastMoveCol = e.col;
            }
        }
    });
    function calculateColScrollDiff(e) {
        var colDiff = 0;
        if (e.clientX > (grid.container && grid.container.getBoundingClientRect().right || window.innerWidth)) {
            colDiff = 1;
        }
        else if (grid.viewPort.toGridX(e.clientX) < grid.virtualPixelCellModel.fixedWidth()) {
            colDiff = -1;
        }
        return colDiff;
    }
    function calculateRowScrollDiff(e) {
        var rowDiff = 0;
        if (e.clientY > (grid.container && grid.container.getBoundingClientRect().bottom || window.innerHeight)) {
            rowDiff = 1;
        }
        else if (grid.viewPort.toGridY(e.clientY) < grid.virtualPixelCellModel.fixedHeight()) {
            rowDiff = -1;
        }
        return rowDiff;
    }
    function setupDragEventForMouseDown(downEvent) {
        var lastDragRow = downEvent.row;
        var lastDragCol = downEvent.col;
        var dragStarted = false;
        var unbindAutoScrollDrag;
        var lastX = downEvent.clientX;
        var lastY = downEvent.clientY;
        var unbindMove = grid.eventLoop.bind(window, 'mousemove', function (mousemoveEvent) {
            if (dragStarted && !mousemoveEvent.which) {
                console.log('mousemove unbind, how on earth do these happen?');
                handleMouseUp(mousemoveEvent);
                return;
            }
            if (!dragStarted) {
                if (lastX === mousemoveEvent.clientX && lastY === mousemoveEvent.clientY) {
                    console.warn('Got a mouse move event with ', mousemoveEvent.clientX, ',', mousemoveEvent.clientY, ' when the last position was ', lastX, ',', lastY);
                }
                createAndFireCustomMouseEvent('grid-drag-start', downEvent, function (dragStart) {
                    var onlyFixedRows = !calculateRowScrollDiff(mousemoveEvent);
                    var onlyFixedCols = !calculateColScrollDiff(mousemoveEvent);
                    dragStart.enableAutoScroll = function () {
                        if (unbindAutoScrollDrag) {
                            unbindAutoScrollDrag();
                        }
                        unbindAutoScrollDrag = grid.eventLoop.bind('grid-drag', function (gridDragEvent) {
                            var newRowDiff = calculateRowScrollDiff(gridDragEvent);
                            onlyFixedRows = !newRowDiff;
                            var rowDiff = onlyFixedRows ? 0 : newRowDiff;
                            var newColDiff = calculateColScrollDiff;
                            onlyFixedCols = !newColDiff;
                            var colDiff = onlyFixedCols ? 0 : newColDiff(gridDragEvent);
                            if (scrollInterval != undefined) {
                                clearInterval(scrollInterval);
                            }
                            if (rowDiff || colDiff) {
                                scrollInterval = grid.interval(function () {
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
        var unbindUp = grid.eventLoop.bind(window, 'mouseup', handleMouseUp);
        function handleMouseUp(e) {
            if (scrollInterval != undefined) {
                clearInterval(scrollInterval);
            }
            unbindMove();
            unbindUp();
            if (unbindAutoScrollDrag) {
                unbindAutoScrollDrag();
            }
            var dragEnd = createCustomEventFromMouseEvent('grid-drag-end', e);
            grid.eventLoop.fire(dragEnd);
        }
    }
    function createCustomEventFromMouseEvent(type, e) {
        var event = custom_event_1.default(type, true, true);
        PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach(function (prop) {
            event[prop] = e[prop];
        });
        event.originalEvent = e;
        return event;
    }
    function createAndFireCustomMouseEvent(type, e, annotateEvent) {
        var drag = createCustomEventFromMouseEvent(type, e);
        if (annotateEvent) {
            drag = annotateEvent(drag) || drag;
        }
        if (e.target) {
            e.target.dispatchEvent(drag);
        }
        else {
            grid.eventLoop.fire(drag);
        }
        return drag;
    }
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map