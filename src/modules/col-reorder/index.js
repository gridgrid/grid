module.exports = function (_grid) {
    var grid = _grid;

    var api = {annotateDecorator: makeReorderDecorator};

    function makeReorderDecorator(decorator) {
        var col = decorator.left;
        decorator._dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');

        decorator._dragRect.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-rect');
        };

        decorator._onDragStart = function (e) {

            grid.decorators.add(decorator._dragRect);

            decorator._dragRect.width = grid.viewPort.getColWidth(col);
            var colOffset = e.gridX - decorator.getDecoratorLeft();

            decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                decorator._dragRect.left = e.gridX - colOffset;
            });

            decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.decorators.remove(decorator._dragRect);
                decorator._unbindDrag();
                decorator._unbindDragEnd();
            });
        };

        decorator.postRender = function (div) {
            div.setAttribute('class', 'grid-col-reorder');
            grid.eventLoop.bind('grid-drag-start', div, decorator._onDragStart);
        };

        return decorator;
    }

    require('@grid/header-decorators')(grid, api);

    return api;
};