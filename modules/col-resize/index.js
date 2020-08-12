"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var header_decorators_1 = require("../header-decorators");
function create(grid) {
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
            grid.eventLoop.stopBubbling(e);
        };
        headerDecorator._onDragStart = function (e) {
            grid.eventLoop.stopBubbling(e);
            grid.decorators.add(headerDecorator._dragLine);
            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (gridDragEvent) {
                var minX = headerDecorator.getDecoratorLeft() + 22;
                headerDecorator._dragLine.left = Math.max(gridDragEvent.gridX, minX);
            });
            headerDecorator._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);
            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
                var dragLeft = headerDecorator._dragLine.left;
                if (dragLeft !== undefined && col !== undefined) {
                    var newWidth_1 = dragLeft - headerDecorator.getDecoratorLeft();
                    grid.view.col.get(col).width = newWidth_1;
                    grid.colModel.getSelected().forEach(function (dataIdx) {
                        grid.data.col.get(dataIdx).width = newWidth_1;
                    });
                }
                removeDecoratorsAndUnbind();
            });
            function removeDecoratorsAndUnbind() {
                grid.decorators.remove(headerDecorator._dragLine);
                if (headerDecorator._unbindDrag) {
                    headerDecorator._unbindDrag();
                }
                if (headerDecorator._unbindDragEnd) {
                    headerDecorator._unbindDragEnd();
                }
                if (headerDecorator._unbindKeyDown) {
                    headerDecorator._unbindKeyDown();
                }
                return true;
            }
        };
        headerDecorator.postRender = function (div) {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';
            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');
            div.setAttribute('dts', 'grid_header_resize');
            grid.eventLoop.bind(div, 'grid-drag-start', headerDecorator._onDragStart);
            grid.eventLoop.bind(div, 'mousedown', headerDecorator._onMousedown);
        };
    }
    header_decorators_1.default(grid, api);
    return api;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map