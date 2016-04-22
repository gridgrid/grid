var key = require('key');

module.exports = function (_grid) {
    var grid = _grid;

    var api = {
        annotateDecorator: annotateDecorator
    };

    function annotateDecorator(headerDecorator) {
        var col = headerDecorator.left;
        headerDecorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');
        headerDecorator._dragLine.fixed = true;

        headerDecorator._dragLine.postRender = function (div) {
            div.setAttribute('class', 'grid-drag-line');
        };

        headerDecorator._onMousedown = function (e) {
            //prevent mousedowns from getting to selection if they hit the dragline
            grid.eventLoop.stopBubbling(e);
        };

        headerDecorator._onDragStart = function (e) {

            grid.eventLoop.stopBubbling(e);

            grid.decorators.add(headerDecorator._dragLine);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                var minX = headerDecorator.getDecoratorLeft() + 22;
                headerDecorator._dragLine.left = Math.max(e.gridX, minX);
            });

            headerDecorator._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                var newWidth = headerDecorator._dragLine.left - headerDecorator.getDecoratorLeft();
                grid.view.col.get(col).width = newWidth;
                grid.colModel.getSelected().forEach(function (dataIdx) {
                    grid.data.col.get(dataIdx).width = newWidth;
                });
                removeDecoratorsAndUnbind();
            });

            function removeDecoratorsAndUnbind() {
                grid.decorators.remove(headerDecorator._dragLine);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
                headerDecorator._unbindKeyDown && headerDecorator._unbindKeyDown();
                return true; // for the escape stack
            }
        };

        headerDecorator.postRender = function (div) {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';

            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');
            div.setAttribute('dts', 'grid_header_resize');

            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
            grid.eventLoop.bind('mousedown', div, headerDecorator._onMousedown);
        };
    }

    require('../header-decorators')(grid, api);

    return api;
};
