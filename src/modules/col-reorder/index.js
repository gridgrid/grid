var elementClass = require('element-class');
var util = require('@grid/util');


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
            if (e.realCol < grid.colModel.numFixed()) {
                return;
            }


            grid.decorators.add(headerDecorator._dragRect);

            headerDecorator._dragRect.width = grid.viewPort.getColWidth(col);
            var colOffset = e.gridX - headerDecorator.getDecoratorLeft();

            headerDecorator._dragRect._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
            headerDecorator._dragRect._targetCol.postRender = function (div) {
                div.setAttribute('class', 'grid-reorder-target');
                headerDecorator._dragRect._targetCol._renderedElem = div;
            };
            grid.decorators.add(headerDecorator._dragRect._targetCol);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                headerDecorator._dragRect.left = util.clamp(e.gridX - colOffset, grid.viewPort.getColLeft(grid.colModel.numFixed()), Infinity);
                headerDecorator._dragRect._targetCol.left = util.clamp(e.realCol, grid.colModel.numFixed(), Infinity);
                if (e.realCol > col) {
                    elementClass(headerDecorator._dragRect._targetCol._renderedElem).add('right');
                } else {
                    elementClass(headerDecorator._dragRect._targetCol._renderedElem).remove('right');
                }


            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                var targetCol = headerDecorator._dragRect._targetCol.left;

                grid.colModel.move(grid.viewPort.toVirtualCol(col), grid.viewPort.toVirtualCol(targetCol));
                grid.decorators.remove([headerDecorator._dragRect._targetCol, headerDecorator._dragRect]);
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