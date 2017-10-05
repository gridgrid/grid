import { Grid } from '../core';
import { IDecorator } from '../decorators';
import { AnnotatedMouseEventUnion, IGridDragStartEvent } from '../event-loop';
import addHeaderDecorators, { IHeaderDecorator } from '../header-decorators';

export interface IResizeHeader extends IHeaderDecorator {
    _dragLine: IDecorator;
    _onMousedown(e: AnnotatedMouseEventUnion): void;
    _onDragStart(e: IGridDragStartEvent): void;
    _unbindDrag?(): void;
    _unbindKeyDown?(): void;
    _unbindDragEnd?(): void;
}

export interface IColResize {
    annotateDecorator(d: IResizeHeader): void;
}

export function create(grid: Grid) {

    const api: IColResize = {
        annotateDecorator
    };

    function annotateDecorator(headerDecorator: IResizeHeader) {
        const col = headerDecorator.left;
        headerDecorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');
        headerDecorator._dragLine.fixed = true;

        headerDecorator._dragLine.postRender = (div) => {
            div.setAttribute('class', 'grid-drag-line');
        };

        headerDecorator._onMousedown = (e) => {
            // prevent mousedowns from getting to selection if they hit the dragline
            grid.eventLoop.stopBubbling(e);
        };

        headerDecorator._onDragStart = (e) => {

            grid.eventLoop.stopBubbling(e);

            grid.decorators.add(headerDecorator._dragLine);

            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', (gridDragEvent) => {
                const minX = headerDecorator.getDecoratorLeft() + 22;
                headerDecorator._dragLine.left = Math.max(gridDragEvent.gridX, minX);
            });

            headerDecorator._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);

            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', () => {
                const dragLeft = headerDecorator._dragLine.left;
                if (dragLeft !== undefined && col !== undefined) {
                    const newWidth = dragLeft - headerDecorator.getDecoratorLeft();
                    grid.view.col.get(col).width = newWidth;
                    grid.colModel.getSelected().forEach((dataIdx) => {
                        grid.data.col.get(dataIdx).width = newWidth;
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
                return true; // for the escape stack
            }
        };

        headerDecorator.postRender = (div) => {
            div.style.transform = 'translateX(50%)';
            div.style.webkitTransform = 'translateX(50%)';

            div.style.removeProperty('left');
            div.setAttribute('class', 'col-resize');
            div.setAttribute('dts', 'grid_header_resize');

            grid.eventLoop.bind(div, 'grid-drag-start', headerDecorator._onDragStart);
            grid.eventLoop.bind(div, 'mousedown', headerDecorator._onMousedown);
        };
    }

    addHeaderDecorators(grid, api);

    return api;
}

export default create;
