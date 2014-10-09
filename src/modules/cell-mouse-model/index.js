module.exports = function (_grid) {
    var grid = _grid;

    var model = {};

    grid.eventLoop.addInterceptor(function (e) {
        switch (e.type) {
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
                var x = e.clientX;
                var y = e.clientY;
                e.gridRow = grid.viewPort.getVirtualRowByTop(y);
                e.gridCol = grid.viewPort.getVirtualColByLeft(x);
                break;

        }
    });


    return model;
};