module.exports = function (_grid) {
    var grid = _grid;

    var api = {annotateDecorator: makeReorderDecorator};

    function makeReorderDecorator(headerDecorator) {
        var col = headerDecorator.left;
        headerDecorator._dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');

        headerDecorator._dragRect.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-rect');
        };

        headerDecorator._onDragStart = function (e) {

            grid.decorators.add(headerDecorator._dragRect);

            headerDecorator._dragRect.width = grid.viewPort.getColWidth(col);
            var colOffset = e.gridX - headerDecorator.getDecoratorLeft();

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                headerDecorator._dragRect.left = e.gridX - colOffset;
            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.decorators.remove(headerDecorator._dragRect);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
            });
        };

        headerDecorator.postRender = function (div) {
            div.setAttribute('class', 'grid-col-reorder');
            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
        };

        return headerDecorator;
    }

    require('@grid/header-decorators')(grid, api);

    return api;
};