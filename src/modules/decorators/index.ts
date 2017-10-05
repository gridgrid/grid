import { Grid } from '../core';
import makeDirtyClean, { IDirtyClean } from '../dirty-clean';
import mixinPositionRange, { IPartialPositionRange, PositionSpace, PositionUnit } from '../position-range';
import * as util from '../util';

export interface IDecorator extends IPartialPositionRange {
    _decoratorDirtyClean?: IDirtyClean;
    fixed?: boolean;
    boundingBox?: HTMLElement;
    render(): HTMLElement;
    postRender?(elem: HTMLElement): void;
}

export interface IDecoratorModel {
    add(decorators: IDecorator | IDecorator[]): void;
    remove(decorators: IDecorator | IDecorator[]): void;
    getAlive(): IDecorator[];
    popAllDead(): IDecorator[];
    isDirty(): boolean;
    create(t?: number, l?: number, h?: number, w?: number, u?: PositionUnit, s?: PositionSpace): IDecorator;
}

export function create(grid: Grid) {

    const dirtyClean = makeDirtyClean(grid);

    const aliveDecorators: IDecorator[] = [];
    let deadDecorators: IDecorator[] = [];

    const decoratorsInstance: IDecoratorModel = {
        add(_decorators: IDecorator | IDecorator[]) {
            const decorators = util.toArray(_decorators);
            decorators.forEach((decorator) => {
                aliveDecorators.push(decorator);
                if (decorator._decoratorDirtyClean) {
                    decorator._decoratorDirtyClean.enable();
                }
            });
            dirtyClean.setDirty();
        },
        remove(_decorators: IDecorator | IDecorator[]) {
            const decorators = util.toArray(_decorators);
            decorators.forEach((decorator) => {
                const index = aliveDecorators.indexOf(decorator);
                if (index !== -1) {
                    aliveDecorators.splice(index, 1);
                    deadDecorators.push(decorator);
                    if (decorator._decoratorDirtyClean) {
                        decorator._decoratorDirtyClean.disable();
                    }
                    dirtyClean.setDirty();
                }
            });
        },
        getAlive() {
            return aliveDecorators.slice(0);
        },
        popAllDead() {
            const oldDead = deadDecorators;
            deadDecorators = [];
            return oldDead;
        },
        isDirty: dirtyClean.isDirty,
        create(t?: number, l?: number, h?: number, w?: number, u?: PositionUnit, s?: PositionSpace) {
            const thisDirtyClean = makeDirtyClean(grid);

            // mixin the position range functionality
            const decoratorBase = {
                _decoratorDirtyClean: thisDirtyClean,
                // they can override but we should have an empty default to prevent npes
                render() {
                    const div = document.createElement('div');
                    div.style.position = 'absolute';
                    div.style.top = '0px';
                    div.style.left = '0px';
                    div.style.bottom = '0px';
                    div.style.right = '0px';
                    if (decorator.postRender) {
                        decorator.postRender(div);
                    }
                    return div;
                }
            };
            const decorator: IDecorator = mixinPositionRange(
                decoratorBase,
                thisDirtyClean,
                dirtyClean
            );
            decorator.top = t;
            decorator.left = l;
            decorator.height = h;
            decorator.width = w;
            decorator.units = u || decorator.units;
            decorator.space = s || decorator.space;

            return decorator;

        }

    };

    return decoratorsInstance;
}

export default create;