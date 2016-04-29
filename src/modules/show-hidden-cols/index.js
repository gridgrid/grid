module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        _decorators: {}
    };

    function setColShowing(col) {
        grid.colModel.get(col).hidden = false;
    }

    function doWhileHidden(col, fn) {
        while (grid.colModel.get(col - 1).hidden) {
            col--;
            fn && fn(col);
        }
        return col;
    }

    function createDecorator(col, right) {
        var headerDecorator = grid.decorators.create(0, col, 1, 1, 'cell', 'virtual');

        headerDecorator.postRender = function (div) {

            if (right) {
                div.style.transform = 'translate(50%, -50%)';
                div.style.webkitTransform = 'translate(50%, -50%)';
                div.style.removeProperty('left');
            } else {
                div.style.transform = 'translate(-50%, -50%)';
                div.style.webkitTransform = 'translate(-50%, -50%)';
                div.style.removeProperty('right');
            }
            div.style.removeProperty('bottom');
            div.style.top = '50%';
            div.setAttribute('class', 'show-hidden-cols');
            div.setAttribute('dts', 'grid_column_unhide_btn');

            grid.eventLoop.bind('click', div, function () {
                doWhileHidden(col, setColShowing);
            });
        };
        return headerDecorator;
    }

    function maybeRemoveDecorator(col) {
        if (api._decorators[col]) {
            var decorator = api._decorators[col];
            grid.decorators.remove(decorator);
            api._decorators[col] = undefined;
        }
    }

    grid.eventLoop.bind('grid-col-change', function (e) {
        if (e.action === 'hide' || e.action === 'add') {
            e.descriptors.forEach(function (descriptor) {
                var col = descriptor.index;
                if (!col && col !== 0) {
                    return;
                }
                if (descriptor.hidden) {
                    var decCol = col + 1;
                    var rightSide = col === grid.colModel.length(true) - 1;
                    if (rightSide) {
                        //if we're last we actually have to backtrack to the last showing column
                        var lastHiddenCol = doWhileHidden(col);
                        decCol = lastHiddenCol - 1;

                    }
                    maybeRemoveDecorator(col);
                    var decorator = createDecorator(decCol, rightSide);
                    grid.decorators.add(decorator);
                    api._decorators[col] = decorator;
                } else {
                    maybeRemoveDecorator(col);
                }
            });
        }
    });

    return api;
};
