module.exports = function (_grid) {
    var grid = _grid;

    var api = {_decorators: []};

    grid.eventLoop.bind('grid-viewport-change', function () {
        for (var c = 0; c < grid.viewPort.cols; c++) {
            if (!api._decorators[c]) {
                var decorator = grid.decorators.create(0, c, 1, 1, 'cell', 'real');
                var origRender = decorator.render;
                decorator.render = function () {
                    var div = origRender();
                    div.style.transform = 'translateX(50%)';
                    div.style.webkitTransform = 'translateX(50%)';

                    div.style.removeProperty('left');
                    div.setAttribute('class', 'col-resize');
                    return div;
                };
                api._decorators[c] = decorator;
                grid.decorators.add(decorator);
            }
        }
    });

    return api;
};