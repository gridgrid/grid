"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ctrl_or_cmd_1 = require("../ctrl-or-cmd");
var event_loop_1 = require("../event-loop");
var util = require("../util");
var elementClass = require('element-class');
function create(grid) {
    var wasSelectedAtMousedown;
    var model = {
        _dragRects: [],
        _onMousedown: function (e) {
            if (!isTargetingColHeader(e)) {
                return;
            }
            var colDescriptor = grid.data.col.get(e.col);
            wasSelectedAtMousedown = colDescriptor && !!colDescriptor.selected;
            if (wasSelectedAtMousedown && !ctrl_or_cmd_1.default(e)) {
                grid.eventLoop.stopBubbling(e);
            }
        },
        _onDragStart: function (e) {
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
            grid.eventLoop.stopBubbling(e);
            var startCol = e.virtualCol;
            model._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
            model._targetCol.postRender = function (div) {
                div.setAttribute('class', 'grid-reorder-target');
                if (!model._targetCol) {
                    console.error('somehow targetCol was set back to undefined before post render');
                    return;
                }
                model._targetCol._renderedElem = div;
            };
            grid.decorators.add(model._targetCol);
            var selected = grid.colModel.getSelected();
            model._dragRects = selected.map(function (dataCol) {
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
            grid.decorators.add(model._dragRects);
            model._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);
            model._unbindDrag = grid.eventLoop.bind('grid-drag', function (gridDragEvent) {
                model._dragRects.forEach(function (dragRect) {
                    dragRect.left = util.clamp(gridDragEvent.gridX - dragRect.colOffset, grid.viewPort.getColLeft(grid.colModel.numFixed()), Infinity);
                });
                if (!model._targetCol) {
                    console.error('somehow targetCol was set back to undefined before drag');
                    return;
                }
                model._targetCol.left = util.clamp(gridDragEvent.realCol, grid.colModel.numFixed(), Infinity);
                model._targetCol.moveAfter = gridDragEvent.realCol > startCol;
                if (model._targetCol.moveAfter) {
                    elementClass(model._targetCol._renderedElem).add('right');
                }
                else {
                    elementClass(model._targetCol._renderedElem).remove('right');
                }
            });
            model._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
                if (!model._targetCol) {
                    console.error('somehow targetCol was set to undefined before drag end');
                    return;
                }
                var targetDataCol = model._targetCol.left;
                if (targetDataCol !== undefined) {
                    grid.colModel.move(selected.map(function (dataCol) {
                        return grid.data.col.toVirtual(dataCol);
                    }), grid.viewPort.toVirtualCol(targetDataCol), model._targetCol.moveAfter);
                }
                removeDecoratorsAndUnbind();
            });
            function removeDecoratorsAndUnbind() {
                if (model._targetCol) {
                    var removedDecs = __spreadArrays(model._dragRects, [model._targetCol]);
                    grid.decorators.remove(removedDecs);
                }
                if (model._unbindDrag) {
                    model._unbindDrag();
                }
                if (model._unbindDragEnd) {
                    model._unbindDragEnd();
                }
                if (model._unbindKeyDown) {
                    model._unbindKeyDown();
                }
                return true;
            }
        }
    };
    function isTargetingColHeader(e) {
        return e && e.row < 0;
    }
    grid.eventLoop.bind('grid-drag-start', model._onDragStart);
    grid.eventLoop.addInterceptor(function (e) {
        if (event_loop_1.isAnnotatedMouseEventOfType(e, 'mousedown')) {
            model._onMousedown(e);
        }
    });
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map