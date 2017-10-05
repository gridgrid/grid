import { Grid } from '../core';
import { IDecorator } from '../decorators';

export interface IHeaderDecorator extends IDecorator {
    getDecoratorLeft(): number;
}

export interface IHeaderDecoratorCreator {
    makeDecorator?(c: number): IHeaderDecorator;
    annotateDecorator?(h: IHeaderDecorator): void;
    isNeeded?(c: number): boolean;
}

export interface IHeaderDecoratorModel extends IHeaderDecoratorCreator {
    _decorators: { [key: number]: IHeaderDecorator | undefined };
    makeDecorator(c: number): IHeaderDecorator;
}

export function add(grid: Grid, model: IHeaderDecoratorCreator = {}) {
    // tslint:disable-next-line:prefer-object-spread
    const api: IHeaderDecoratorModel = Object.assign(model, { _decorators: {}, makeDecorator: model.makeDecorator || makeDecorator });

    function makeDecorator(col: number) {
        const decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real') as IHeaderDecorator;

        decorator.getDecoratorLeft = () => {
            const firstRect = decorator.boundingBox &&
                decorator.boundingBox.getClientRects &&
                decorator.boundingBox.getClientRects()[0];
            return firstRect && grid.viewPort.toGridX(firstRect.left) || 0;
        };

        if (api.annotateDecorator) {
            api.annotateDecorator(decorator);
        }

        return decorator;
    }

    api.makeDecorator = api.makeDecorator || makeDecorator;

    function ensureDecoratorPerCol() {
        for (let c = 0; c < grid.viewPort.cols; c++) {
            if (!api._decorators[c]) {
                if (api.isNeeded && !api.isNeeded(c)) {
                    continue;
                }
                const decorator = api.makeDecorator(c);
                api._decorators[c] = decorator;
                grid.decorators.add(decorator);
            }
        }
    }

    grid.eventLoop.bind('grid-viewport-change', () => {
        ensureDecoratorPerCol();
    });
    ensureDecoratorPerCol();

    return api;
}

export default add;