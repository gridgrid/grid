module.exports = function (_grid) {
    var grid = _grid;


    var api = {annotateDecorator: annotateDecorator};

    function annotateDecorator(decorator) {
        var col = decorator.left;
        decorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');

        decorator._dragLine.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-line');
        };

        decorator._onDragStart = function (e) {

            grid.decorators.add(decorator._dragLine);

            decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                var minX = decorator.getDecoratorLeft() + 10;
                decorator._dragLine.left = Math.max(e.gridX, minX);
            });

            decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.colModel.get(grid.viewPort.toVirtualCol(col)).width = decorator._dragLine.left - decorator.getDecoratorLeft();
                grid.decorators.remove(decorator._dragLine);
                decorator._unbindDrag();
                decorator._unbindDragEnd();
            });
        };

        decorator.postRender = function (div) {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';

            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');

            grid.eventLoop.bind('grid-drag-start', div, decorator._onDragStart);
        };
    }

    require('@grid/header-decorators')(grid, api);

    return api;
};