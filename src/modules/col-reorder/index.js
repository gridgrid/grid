var elementClass = require('element-class');
var util = require('../util');


module.exports = function(_grid) {
    var grid = _grid;

    var api = {
        annotateDecorator: makeReorderDecorator
    };

    function makeReorderDecorator(headerDecorator) {

        var wasSelectedAtMousedown = false;
        headerDecorator._onMousedown = function(e) {
            wasSelectedAtMousedown = grid.data.col.get(e.col).selected;
            if (wasSelectedAtMousedown) {
                // grid.eventLoop.stopBubbling(e);
            }
        }


        headerDecorator._onDragStart = function(e) {

            if (e.realCol < grid.colModel.numFixed() || !wasSelectedAtMousedown) {
                return;
            }
            if (e.enableAutoScroll) {
                e.enableAutoScroll();
            }
            // we want to be the only draggers
            grid.eventLoop.stopBubbling(e);

            var startCol = headerDecorator.left;

            // create the target line
            api._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
            api._targetCol.postRender = function(div) {
                div.setAttribute('class', 'grid-reorder-target');
                api._targetCol._renderedElem = div;
            };
            grid.decorators.add(api._targetCol);

            // create a decorator for each selected col
            var selected = grid.colModel.getSelected();
            api._dragRects = selected.map(function(dataCol) {
                var viewCol = grid.data.col.toView(dataCol);
                var dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');
                dragRect.colOffset = e.gridX - api._decorators[viewCol].getDecoratorLeft();
                dragRect.postRender = function(div) {
                    div.setAttribute('class', 'grid-drag-rect');
                };
                dragRect.width = grid.viewPort.getColWidth(viewCol);
                return dragRect;
            });

            grid.decorators.add(api._dragRects);


            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function(e) {
                api._dragRects.forEach(function(dragRect) {
                    dragRect.left = util.clamp(e.gridX - dragRect.colOffset, grid.viewPort.getColLeft(grid.colModel.numFixed()), Infinity);
                });
                api._targetCol.left = util.clamp(e.realCol, grid.colModel.numFixed(), Infinity);
                api._targetCol.moveAfter = e.realCol > startCol;
                if (api._targetCol.moveAfter) {
                    elementClass(api._targetCol._renderedElem).add('right');
                } else {
                    elementClass(api._targetCol._renderedElem).remove('right');
                }


            });

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function() {
                var targetCol = api._targetCol.left;

                grid.colModel.move(selected.map(function(dataCol) {
                    return grid.data.col.toVirtual(dataCol);
                }), grid.viewPort.toVirtualCol(targetCol), api._targetCol.moveAfter);

                var removedDecs = api._dragRects.concat(api._targetCol);
                grid.decorators.remove(removedDecs);
                headerDecorator._unbindDrag();
                headerDecorator._unbindDragEnd();
            });
        };

        headerDecorator.postRender = function(div) {
            div.setAttribute('class', 'grid-col-reorder');
            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
            grid.eventLoop.bind('mousedown', div, headerDecorator._onMousedown);
        };

        return headerDecorator;
    }

    require('../header-decorators')(grid, api);

    return api;
};