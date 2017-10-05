import { Grid } from '../core';
import { IDecorator } from '../decorators';

export interface IShowHiddenCols {
    _decorators: { [key: number]: IDecorator | undefined };
}

export function create(grid: Grid) {
    const api: IShowHiddenCols = {
        _decorators: {}
    };

    function setColShowing(col: number) {
        grid.colModel.get(col).hidden = false;
    }

    function doWhileHidden(col: number, fn: ((c: number) => void) | undefined, inc: number) {
        let colDescriptor;
        // tslint:disable-next-line:no-conditional-assignment
        while ((colDescriptor = grid.colModel.get(col)) !== undefined && colDescriptor.hidden) {
            if (fn) {
                fn(col);
            }
            col = col + inc;
        }
        return col;
    }

    function createDecorator(col: number, right: boolean) {
        const headerDecorator = grid.decorators.create(0, col, 1, 1, 'cell', 'virtual');

        headerDecorator.postRender = (div) => {

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

            grid.eventLoop.bind(div, 'click', () => {
                const inc = right ? 1 : -1;
                doWhileHidden(col + inc, setColShowing, inc);
            });
        };
        return headerDecorator;
    }

    function maybeRemoveDecorator(col: number) {
        if (api._decorators[col]) {
            const decorator = api._decorators[col];
            if (decorator !== undefined) {
                grid.decorators.remove(decorator);
                api._decorators[col] = undefined;
            }
        }
    }

    grid.eventLoop.bind('grid-col-change', (e) => {
        if (e.action === 'hide' || e.action === 'add') {
            e.descriptors.forEach((descriptor) => {
                const col = descriptor.index;
                if (!col && col !== 0) {
                    return;
                }
                if (descriptor.hidden) {
                    let decCol = col;
                    let showingCol = doWhileHidden(col, undefined, -1);
                    const rightSide = showingCol !== -1;
                    if (!rightSide) {
                        // we actually have to backtrack to the last showing column
                        showingCol = doWhileHidden(col, undefined, 1);
                    }
                    decCol = showingCol;
                    maybeRemoveDecorator(col);
                    const decorator = createDecorator(decCol, rightSide);
                    grid.decorators.add(decorator);
                    api._decorators[col] = decorator;
                } else {
                    maybeRemoveDecorator(col);
                }
            });
        }
    });

    return api;
}

export default create;