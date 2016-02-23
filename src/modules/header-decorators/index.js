module.exports = function(_grid, model) {
    var grid = _grid;

    var api = model || {};
    api._decorators = {};

    function makeDecorator(col) {
        var decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real');

        decorator.getDecoratorLeft = function() {
            var firstRect = decorator.boundingBox && decorator.boundingBox.getClientRects() && decorator.boundingBox.getClientRects()[0] || {};
            return grid.viewPort.toGridX(firstRect.left) || 0;
        };

        if (api.annotateDecorator) {
            api.annotateDecorator(decorator);
        }

        return decorator;
    }

    api.makeDecorator = api.makeDecorator || makeDecorator;

    function ensureDecoratorPerCol() {
        for (var c = 0; c < grid.viewPort.cols; c++) {
            if (!api._decorators[c]) {
                if (api.isNeeded && !api.isNeeded(c)) {
                    continue;
                }
                var decorator = api.makeDecorator(c);
                api._decorators[c] = decorator;
                grid.decorators.add(decorator);
            }
        }
    }

    grid.eventLoop.bind('grid-viewport-change', function() {
        ensureDecoratorPerCol();
    });
    ensureDecoratorPerCol();

    return api;
};