var extend = require('@grid/extend');
var customEvent = require('@grid/custom-event');

function createFakeEvent(type, e) {
    var dragStart = extend({}, e);
    dragStart.type = type;
    return dragStart;
}
module.exports = function (_grid) {
    var grid = _grid;

    var model = {};

    grid.eventLoop.addInterceptor(function (e) {
        //hmm, is this the easiest way to do something for all mouse events, seems easier than a big if statement
        switch (e.type) {
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
                var x = e.clientX;
                var y = e.clientY;
                e.row = grid.viewPort.getVirtualRowByTop(y);
                e.col = grid.viewPort.getVirtualColByLeft(x);
                break;

        }
    });

    grid.eventLoop.bind('mousedown', function (e) {
        switch (e.type) {
            case 'mousedown':
                var lastDragRow = e.row;
                var lastDragCol = e.col;
                var dragStarted = false;
                var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
                    if (!dragStarted) {
                        var dragStart = createFakeEvent('grid-drag-start', e);
                        //row, col, x, and y should inherit
                        grid.eventLoop.fire(dragStart);
                        dragStarted = true;
                    }

                    var drag = createFakeEvent('grid-drag', e);

                    //row, col, x, and y should inherit
                    grid.eventLoop.fire(drag);

                    if (e.row !== lastDragRow || e.col !== lastDragCol) {
                        var cellDrag = createFakeEvent('grid-cell-drag', e);

                        //row, col, x, and y should inherit
                        grid.eventLoop.fire(cellDrag);
                        lastDragRow = e.row;
                        lastDragCol = e.col;
                    }

                });

                var unbindUp = grid.eventLoop.bind('mouseup', window, function (e) {
                    unbindMove();
                    unbindUp();

                    var dragEnd = createFakeEvent('grid-drag-end', e);

                    //row, col, x, and y should inherit
                    grid.eventLoop.fire(dragEnd);
                });

                //keep it from doing weird crap
                //e.preventDefault();
                break;
        }
    });


    return model;
};