module.exports = function (_grid) {
    var grid = _grid;

    var api = {_decorators: []};

    function makeResizeDecorator(col) {
        var decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real');


        function getDecoratorLeft() {
            return decorator.boundingBox && decorator.boundingBox.getClientRects()[0].left || 0;
        }

        decorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');

        decorator._dragLine.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-line');
        };

        decorator._onDragStart = function (e) {

            grid.decorators.add(decorator._dragLine);

            decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                var minX = getDecoratorLeft() + 10;
                decorator._dragLine.left = Math.max(e.gridX, minX);
            });

            decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                grid.colModel.get(grid.viewPort.toVirtualCol(col)).width = decorator._dragLine.left - getDecoratorLeft();
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

        return decorator;
    }

    grid.eventLoop.bind('grid-viewport-change', function () {
        for (var c = 0; c < grid.viewPort.cols; c++) {
            if (!api._decorators[c]) {
                var decorator = makeResizeDecorator(c);
                api._decorators[c] = decorator;
                grid.decorators.add(decorator);
            }
        }
    });

    return api;
};