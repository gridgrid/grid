var customEvent = require('../custom-event');

var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'gridX', 'gridY', 'layerX', 'layerY', 'row', 'col', 'realRow', 'realCol'];


module.exports = function(_grid) {
    var grid = _grid;

    var model = {};

    var wasDragged = false;
    var scrollInterval;

    model._annotateEvent = function annotateEvent(e) {
        switch (e.type) {
            case 'click':
            case 'dblclick':
                e.wasDragged = wasDragged;
                /* jshint -W086 */
            case 'mousedown':
                /* jshint +W086 */
            case 'mousemove':
            case 'mouseup':
                model._annotateEventInternal(e);
                break;

        }
    };

    model._annotateEventFromViewCoords = function(e, viewRow, viewCol) {
        e.realRow = viewRow;
        e.realCol = viewCol;
        e.virtualRow = grid.view.row.toVirtual(e.realRow);
        e.virtualCol = grid.view.col.toVirtual(e.realCol);
        e.row = grid.virtual.row.toData(e.virtualRow);
        e.col = grid.virtual.col.toData(e.virtualCol);
        return e;
    };

    model._annotateEventInternal = function(e) {
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
    grid.eventLoop.addInterceptor(function(e) {
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

    grid.eventLoop.bind('grid-drag', function(e) {
        //if it gets here then we will try to auto scroll
        var rowDiff = 0;
        var colDiff = 0;
        if (e.clientX > window.innerWidth) {
            colDiff = 1;
        } else if (grid.viewPort.toGridX(e.clientX) < grid.virtualPixelCellModel.fixedWidth()) {
            colDiff = -1;
        }

        if (e.clientY > window.innerHeight) {
            rowDiff = 1;
        } else if (grid.viewPort.toGridY(e.clientY) < grid.virtualPixelCellModel.fixedHeight()) {
            rowDiff = -1;
        }

        clearInterval(scrollInterval);
        if (rowDiff || colDiff) {
            scrollInterval = grid.interval(function() {
                grid.cellScrollModel.scrollTo(grid.cellScrollModel.row + rowDiff, grid.cellScrollModel.col + colDiff);
            }, 100);
        }

    });

    function setupDragEventForMouseDown(downEvent) {
        wasDragged = false;
        var lastDragRow = downEvent.row;
        var lastDragCol = downEvent.col;
        var dragStarted = false;
        var unbindMove = grid.eventLoop.bind('mousemove', window, function(e) {
            if (dragStarted && !e.which) {
                //got a move event without mouse down which means we somehow missed the mouseup
                console.log('mousemove unbind, how on earth do these happen?');
                handleMouseUp(e);
                return;
            }

            if (!dragStarted) {
                wasDragged = true;
                createAndFireCustomMouseEvent('grid-drag-start', downEvent);
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

            var dragEnd = createCustomEventFromMouseEvent('grid-drag-end', e);

            //row, col, x, and y should inherit
            grid.eventLoop.fire(dragEnd);
        }
    }

    function createCustomEventFromMouseEvent(type, e) {
        var event = customEvent(type, true, true);
        PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach(function(prop) {
            event[prop] = e[prop];
        });
        event.originalEvent = e;
        return event;
    }

    function createAndFireCustomMouseEvent(type, e) {
        var drag = createCustomEventFromMouseEvent(type, e);
        if (e.target) {
            e.target.dispatchEvent(drag);
        } else {
            grid.eventLoop.fire(drag);
        }
        return drag;
    }

    return model;
};