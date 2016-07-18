var elementClass = require('element-class');
var util = require('../util');
var ctrlOrCmd = require('../ctrl-or-cmd');
var key = require('key');

module.exports = function (_grid) {
    var grid = _grid;
    var api = {};
    var wasSelectedAtMousedown

    function isTargetingColHeader(e) {
        return e && e.row < 0;
    }

    api._onMousedown = function (e) {
        if (!isTargetingColHeader(e)) {
            return;
        }

        var colDescriptor = grid.data.col.get(e.col);
        wasSelectedAtMousedown = colDescriptor && !!colDescriptor.selected;
        if (wasSelectedAtMousedown && !ctrlOrCmd(e)) {
            grid.eventLoop.stopBubbling(e);
        }
    }

    api._onDragStart = function (e) {

        if (!isTargetingColHeader(e) || e.realCol < grid.colModel.numFixed() || !wasSelectedAtMousedown) {
            return;
        }

        var colDescriptor = grid.view.col.get(e.realCol);
        if (!colDescriptor || colDescriptor.selectable === false) {
            return;
        }
        if (e.enableAutoScroll) {
            e.enableAutoScroll();
        }
        // we want to be the only draggers
        grid.eventLoop.stopBubbling(e);

        var startCol = e.virtualCol;

        // create the target line
        api._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
        api._targetCol.postRender = function (div) {
            div.setAttribute('class', 'grid-reorder-target');
            api._targetCol._renderedElem = div;
        };
        grid.decorators.add(api._targetCol);

        // create a decorator for each selected col
        var selected = grid.colModel.getSelected();
        api._dragRects = selected.map(function (dataCol) {
            var viewCol = grid.data.col.toView(dataCol);
            var dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');
            dragRect.fixed = true;
            dragRect.colOffset = e.gridX - grid.viewPort.getColLeft(viewCol);
            dragRect.postRender = function (div) {
                div.setAttribute('class', 'grid-drag-rect');
            };
            dragRect.width = grid.viewPort.getColWidth(viewCol);
            return dragRect;
        });

        grid.decorators.add(api._dragRects);

        api._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);

        api._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
            api._dragRects.forEach(function (dragRect) {
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

        api._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
            var targetCol = api._targetCol.left;

            grid.colModel.move(selected.map(function (dataCol) {
                return grid.data.col.toVirtual(dataCol);
            }), grid.viewPort.toVirtualCol(targetCol), api._targetCol.moveAfter);

            removeDecoratorsAndUnbind();
        });

        function removeDecoratorsAndUnbind() {
            var removedDecs = api._dragRects.concat(api._targetCol);
            grid.decorators.remove(removedDecs);
            api._unbindDrag();
            api._unbindDragEnd();
            api._unbindKeyDown && api._unbindKeyDown();
            return true; // for the escape stack
        }
    };

    grid.eventLoop.bind('grid-drag-start', api._onDragStart);
    grid.eventLoop.addInterceptor(function (e) {
        if (e.type === 'mousedown') {
            api._onMousedown(e);
        }
    });

    return api;
};
