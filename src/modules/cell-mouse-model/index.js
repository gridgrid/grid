var extend = require('@grid/extend');
var customEvent = require('@grid/custom-event');

var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'layerX', 'layerY', 'row', 'col'];


module.exports = function (_grid) {
    var grid = _grid;

    var model = {};

    grid.eventLoop.addInterceptor(function (e) {
        //hmm, is this the easiest way to do something for all mouse events, seems easier than a big if statement
        switch (e.type) {
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
            case 'click':
                var x = e.clientX;
                var y = e.clientY;
                e.row = grid.viewPort.getVirtualRowByTop(y);
                e.col = grid.viewPort.getVirtualColByLeft(x);
                break;

        }
    });

    function createDragEventFromMouseEvent(type, e) {
        var event = customEvent(type, true, true);
        PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach(function (prop) {
            event[prop] = e[prop];
        });
        event.originalEvent = e;
        return event;
    }

    function createAndFireDragEvent(type, e) {
        var drag = createDragEventFromMouseEvent(type, e);
        if (e.target) {
            e.target.dispatchEvent(drag);
        } else {
            grid.eventLoop.fire(drag);
        }
        return drag;
    }

    grid.eventLoop.bind('mousedown', function (downEvent) {
        var lastDragRow = downEvent.row;
        var lastDragCol = downEvent.col;
        var dragStarted = false;
        var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
            if (!dragStarted) {
                createAndFireDragEvent('grid-drag-start', downEvent);
                dragStarted = true;
            }

            createAndFireDragEvent('grid-drag', e);

            if (e.row !== lastDragRow || e.col !== lastDragCol) {
                createAndFireDragEvent('grid-cell-drag', e);

                lastDragRow = e.row;
                lastDragCol = e.col;
            }

        });

        var unbindUp = grid.eventLoop.bind('mouseup', window, function (e) {
            unbindMove();
            unbindUp();

            var dragEnd = createDragEventFromMouseEvent('grid-drag-end', e);

            //row, col, x, and y should inherit
            grid.eventLoop.fire(dragEnd);
        });

        //keep it from doing weird crap
        //e.preventDefault();
    });


    return model;
};