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
                var downY = e.clientY;
                var downX = e.clientX;
                var lastDragRow = e.row;
                var lastDragCol = e.col;
                var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
                    var moveY = e.clientY;
                    var moveX = e.clientX;
                    if (moveY !== downY || moveX !== downX) {
                        var dragStart = Object.create(e, {
                            type: {value: 'grid-drag-start'}
                        });

                        //row, col, x, and y should inherit
                        grid.eventLoop.fire(dragStart);

                        var drag = Object.create(e, {
                            type: {value: 'grid-drag'}
                        });

                        //row, col, x, and y should inherit
                        grid.eventLoop.fire(drag);

                        if (e.row !== lastDragRow || e.col !== lastDragCol) {
                            var cellDrag = Object.create(e, {
                                type: {value: 'grid-cell-drag'}
                            });

                            //row, col, x, and y should inherit
                            grid.eventLoop.fire(cellDrag);
                            lastDragRow = e.row;
                            lastDragCol = e.col;
                        }
                    }
                });

                var unbindUp = grid.eventLoop.bind('mouseup', window, function (e) {
                    unbindMove();
                    unbindUp();

                    var dragEnd = Object.create(e, {
                        type: {value: 'grid-drag-end'}
                    });

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