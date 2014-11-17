module.exports = function (_grid) {
    var grid = _grid;

    var api = {annotateDecorator: annotateDecorator};

    function annotateDecorator(headerDecorator) {
        var col = headerDecorator.left;
        headerDecorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');

        headerDecorator._dragLine.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-line');
        };

        headerDecorator._onDragStart = function (e) {

            grid.decorators.add(headerDecorator._dragLine);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                var minX = headerDecorator.getDecoratorLeft() + 10;
                headerDecorator._dragLine.left = Math.max(e.gridX, minX);
            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.colModel.get(grid.viewPort.toVirtualCol(col)).width = headerDecorator._dragLine.left - headerDecorator.getDecoratorLeft();
                grid.decorators.remove(headerDecorator._dragLine);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
            });
        };

        headerDecorator.postRender = function (div) {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';

            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');

            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
        };
    }

    require('../header-decorators')(grid, api);

    return api;
};