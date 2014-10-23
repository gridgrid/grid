module.exports = function (_grid) {
    var grid = _grid;

    var api = {_decorators: []};

    function makeResizeDecorator(col) {
        var decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real');

        decorator._onDragStart = function (e) {
            decorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');
            grid.decorators.add(decorator._dragLine);
            decorator._dragLine.left = e.gridX;
            decorator._dragLine.postRender = function (div) {
                div.setAttribute('class', 'grid-drag-line');
            };
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