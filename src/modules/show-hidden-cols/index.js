module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        _decorators: {}
    };

    function setColShowing(col) {
        grid.colModel.get(col).hidden = false;
    }

    function doWhileHidden(col, fn, inc) {
        var colDescriptor;
        while ((colDescriptor = grid.colModel.get(col)) !== undefined && colDescriptor.hidden) {
            if (fn) {
                fn(col);
            }
            col = col + inc;
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
                var inc = right ? 1 : -1;
                doWhileHidden(col + inc, setColShowing, inc);
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
                    var decCol = col;
                    var showingCol = doWhileHidden(col, undefined, -1);
                    var rightSide = showingCol !== -1;
                    if (!rightSide) {
                        // we actually have to backtrack to the last showing column
                        showingCol = doWhileHidden(col, undefined, 1);
                    }
                    decCol = showingCol;
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
