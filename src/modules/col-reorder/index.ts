import { Grid } from '../core';
import ctrlOrCmd from '../ctrl-or-cmd';
import { IDecorator } from '../decorators';
import { AnnotatedMouseEventUnion, IAnnotatedEvent, IGridDragStartEvent, isAnnotatedMouseEventOfType } from '../event-loop';
import * as util from '../util';

const elementClass = require('element-class');

export interface ITargetCol extends IDecorator {
    _renderedElem?: HTMLElement;
    moveAfter?: boolean;
}

export interface IDragRect extends IDecorator {
    colOffset: number;
}

export interface IColReorder {
    _targetCol?: ITargetCol;
    _dragRects: IDragRect[];
    _onMousedown(e: AnnotatedMouseEventUnion): void;
    _onDragStart(e: IGridDragStartEvent): void;
    _unbindKeyDown?(): void;
    _unbindDrag?(): void;
    _unbindDragEnd?(): void;
}

export function create(grid: Grid) {
    let wasSelectedAtMousedown: boolean | undefined;
    const model: IColReorder = {
        _dragRects: [],
        _onMousedown(e: AnnotatedMouseEventUnion) {
            if (!isTargetingColHeader(e)) {
                return;
            }

            const colDescriptor = grid.data.col.get(e.col);
            wasSelectedAtMousedown = colDescriptor && !!colDescriptor.selected;
            if (wasSelectedAtMousedown && !ctrlOrCmd(e)) {
                grid.eventLoop.stopBubbling(e);
            }
        },
        _onDragStart(e: IGridDragStartEvent) {

            if (!isTargetingColHeader(e) || e.realCol < grid.colModel.numFixed() || !wasSelectedAtMousedown) {
                return;
            }

            const colDescriptor = grid.view.col.get(e.realCol);
            if (!colDescriptor || colDescriptor.selectable === false) {
                return;
            }
            if (e.enableAutoScroll) {
                e.enableAutoScroll();
            }
            // we want to be the only draggers
            grid.eventLoop.stopBubbling(e);

            const startCol = e.virtualCol;

            // create the target line
            model._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
            model._targetCol.postRender = (div) => {
                div.setAttribute('class', 'grid-reorder-target');
                if (!model._targetCol) {
                    console.error('somehow targetCol was set back to undefined before post render');
                    return;
                }
                model._targetCol._renderedElem = div;
            };
            grid.decorators.add(model._targetCol);

            // create a decorator for each selected col
            const selected = grid.colModel.getSelected();
            model._dragRects = selected.map((dataCol) => {
                const viewCol = grid.data.col.toView(dataCol);
                const dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real') as IDragRect;
                dragRect.fixed = true;
                dragRect.colOffset = e.gridX - grid.viewPort.getColLeft(viewCol);
                dragRect.postRender = (div) => {
                    div.setAttribute('class', 'grid-drag-rect');
                };
                dragRect.width = grid.viewPort.getColWidth(viewCol);
                return dragRect;
            });

            grid.decorators.add(model._dragRects);

            model._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);

            model._unbindDrag = grid.eventLoop.bind('grid-drag', (gridDragEvent) => {
                model._dragRects.forEach((dragRect) => {
                    dragRect.left = util.clamp(
                        gridDragEvent.gridX - dragRect.colOffset,
                        grid.viewPort.getColLeft(grid.colModel.numFixed()),
                        Infinity
                    );
                });
                if (!model._targetCol) {
                    console.error('somehow targetCol was set back to undefined before drag');
                    return;
                }
                model._targetCol.left = util.clamp(gridDragEvent.realCol, grid.colModel.numFixed(), Infinity);
                model._targetCol.moveAfter = gridDragEvent.realCol > startCol;
                if (model._targetCol.moveAfter) {
                    elementClass(model._targetCol._renderedElem).add('right');
                } else {
                    elementClass(model._targetCol._renderedElem).remove('right');
                }
            });

            model._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', () => {
                if (!model._targetCol) {
                    console.error('somehow targetCol was set to undefined before drag end');
                    return;
                }
                const targetDataCol = model._targetCol.left;

                if (targetDataCol !== undefined) {
                    grid.colModel.move(selected.map((dataCol) => {
                        return grid.data.col.toVirtual(dataCol);
                    }), grid.viewPort.toVirtualCol(targetDataCol), model._targetCol.moveAfter);
                }
                removeDecoratorsAndUnbind();
            });

            function removeDecoratorsAndUnbind() {
                if (model._targetCol) {
                    const removedDecs = [...model._dragRects, model._targetCol];
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
                return true; // for the escape stack
            }
        }
    };

    function isTargetingColHeader(e: IAnnotatedEvent) {
        return e && e.row < 0;
    }

    grid.eventLoop.bind('grid-drag-start', model._onDragStart);
    grid.eventLoop.addInterceptor((e) => {
        if (isAnnotatedMouseEventOfType(e, 'mousedown')) {
            model._onMousedown(e);
        }
    });

    return model;
}

export default create;