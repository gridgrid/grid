var customEvent = require('../custom-event');

var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'gridX', 'gridY', 'layerX', 'layerY', 'row', 'col', 'realRow', 'realCol', 'virtualRow', 'virtualCol'];


module.exports = function (_grid) {
    var grid = _grid;

    var model = {};

    var scrollInterval;

    model._annotateEvent = function annotateEvent(e) {
        /*eslint-disable no-fallthrough*/
        switch (e.type) {
            case 'click':
            case 'dblclick':
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
                model._annotateEventInternal(e);
                break;
        }
        /*eslint-enable no-fallthrough*/
    };

    model._annotateEventFromViewCoords = function (e, viewRow, viewCol) {
        e.realRow = viewRow;
        e.realCol = viewCol;
        e.virtualRow = grid.view.row.toVirtual(e.realRow);
        e.virtualCol = grid.view.col.toVirtual(e.realCol);
        e.row = grid.virtual.row.toData(e.virtualRow);
        e.col = grid.virtual.col.toData(e.virtualCol);
        return e;
    };

    model._annotateEventInternal = function (e) {
        var y = grid.viewPort.toGridY(e.clientY);
        var x = grid.viewPort.toGridX(e.clientX);
        var viewRow = grid.viewPort.getRowByTop(y);
        var viewCol = grid.viewPort.getColByLeft(x);
        model._annotateEventFromViewCoords(e, viewRow, viewCol);
        e.gridX = x;
        e.gridY = y;
    };

    var lastMoveRow;
    var lastMoveCol;
    grid.eventLoop.addInterceptor(function (e) {
        model._annotateEvent(e);
        if (e.type === 'mousedown') {
            if (e.currentTarget === grid.container) {
                setupDragEventForMouseDown(e);
            }
        } else if (e.type === 'mousemove') {
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
        } else if (grid.viewPort.toGridX(e.clientX) < grid.virtualPixelCellModel.fixedWidth()) {
            colDiff = -1;
        }
        return colDiff;
    }

    function calculateRowScrollDiff(e) {
        var rowDiff = 0;
        if (e.clientY > (grid.container && grid.container.getBoundingClientRect().bottom || window.innerHeight)) {
            rowDiff = 1;
        } else if (grid.viewPort.toGridY(e.clientY) < grid.virtualPixelCellModel.fixedHeight()) {
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
        var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {


            if (dragStarted && !e.which) {
                // got a move event without mouse down which means we somehow missed the mouseup
                console.log('mousemove unbind, how on earth do these happen?');
                handleMouseUp(e);
                return;
            }

            if (!dragStarted) {
                if (lastX === e.clientX && lastY === e.clientY) {
                    console.warn('Got a mouse move event with ', e.clientX, ',', e.clientY, ' when the last position was ', lastX, ',', lastY);
                }
                createAndFireCustomMouseEvent('grid-drag-start', downEvent, function annotateDragStart(dragStart) {
                    var onlyFixedRows = !calculateRowScrollDiff(e);
                    var onlyFixedCols = !calculateColScrollDiff(e);
                    dragStart.enableAutoScroll = function () {
                        if (unbindAutoScrollDrag) {
                            unbindAutoScrollDrag();
                        }
                        unbindAutoScrollDrag = grid.eventLoop.bind('grid-drag', function (e) {
                            // if it gets here then we will try to auto scroll
                            var newRowDiff = calculateRowScrollDiff(e);
                            onlyFixedRows = !newRowDiff;
                            var rowDiff = onlyFixedRows ? 0 : newRowDiff;


                            var newColDiff = calculateColScrollDiff;
                            onlyFixedCols = !newColDiff;
                            var colDiff = onlyFixedCols ? 0 : newColDiff(e);

                            clearInterval(scrollInterval);
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

            createAndFireCustomMouseEvent('grid-drag', e);

            if (e.row !== lastDragRow || e.col !== lastDragCol) {
                createAndFireCustomMouseEvent('grid-cell-drag', e);

                lastDragRow = e.row;
                lastDragCol = e.col;
            }

        });

        var unbindUp = grid.eventLoop.bind('mouseup', window, handleMouseUp);

        function handleMouseUp(e) {
            clearInterval(scrollInterval);
            unbindMove();
            unbindUp();
            if (unbindAutoScrollDrag) {
                unbindAutoScrollDrag();
            }

            var dragEnd = createCustomEventFromMouseEvent('grid-drag-end', e);

            // row, col, x, and y should inherit
            grid.eventLoop.fire(dragEnd);
        }
    }

    function createCustomEventFromMouseEvent(type, e) {
        var event = customEvent(type, true, true);
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
        } else {
            grid.eventLoop.fire(drag);
        }
        return drag;
    }

    return model;
};
