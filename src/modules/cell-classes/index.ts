import { Grid } from '../core';
import makeDirtyClean, { IDirtyClean } from '../dirty-clean';
import addDirtyProps from '../dirty-props';
import mixinPositionRange, { IPartialPositionRange, PositionSpace, toStandardSpace } from '../position-range';

export interface ICellClassDescriptor extends IPartialPositionRange {
    _cellClassDirtyClean: IDirtyClean;
    class?: string;
}

export interface ICellClasses {
    add(descriptor: ICellClassDescriptor): void;
    remove(descriptor: ICellClassDescriptor): void;
    getAll(): ICellClassDescriptor[];
    getCachedClasses(vRow: number, vCol: number): string[];
    create(
        top?: number,
        left?: number,
        className?: string,
        height?: number,
        width?: number,
        space?: PositionSpace
    ): ICellClassDescriptor;
    isDirty(): boolean;
}

export function create(grid: Grid) {
    const dirtyClean = makeDirtyClean(grid);
    const descriptors: ICellClassDescriptor[] = [];
    let cachedClassMatrix: string[][][] = [];

    const api: ICellClasses = {
        add(descriptor: ICellClassDescriptor) {
            descriptors.push(descriptor);
            addOrRemoveCachedClass(descriptor);
            if (descriptor._cellClassDirtyClean) {
                descriptor._cellClassDirtyClean.enable();
            }
            dirtyClean.setDirty();
        },
        remove(descriptor: ICellClassDescriptor) {
            const index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                addOrRemoveCachedClass(descriptor, true);
                if (descriptor._cellClassDirtyClean) {
                    descriptor._cellClassDirtyClean.disable();
                }
                dirtyClean.setDirty();
            }
        },
        getAll(): ICellClassDescriptor[] {
            return descriptors.slice(0);
        },
        getCachedClasses(vRow: number, vCol: number): string[] {
            return cachedClassMatrix[vRow] && cachedClassMatrix[vRow][vCol] || [];
        },
        create(
            top?: number,
            left?: number,
            className?: string,
            height?: number,
            width?: number,
            space?: PositionSpace
        ): ICellClassDescriptor {
            const thisDirtyClean = makeDirtyClean(grid);
            const descriptor: ICellClassDescriptor = mixinPositionRange({
                _cellClassDirtyClean: thisDirtyClean
            }, thisDirtyClean, dirtyClean, {
                    preDirty: classPreDirty,
                    onDirty: classOnDirty
                });
            // mixins

            function classPreDirty() {
                // check for descriptor definition because this will actually get called during position range mixin before it's defined
                if (descriptor) {
                    addOrRemoveCachedClass(descriptor, true);
                }
            }

            function classOnDirty() {
                // check for descriptor definition because this will actually get called during position range mixin before it's defined
                if (descriptor) {
                    addOrRemoveCachedClass(descriptor);
                }
            }

            addDirtyProps(descriptor, [{
                name: 'class',
                preDirty: classPreDirty,
                onDirty: classOnDirty
            }], [thisDirtyClean, dirtyClean]);

            // all of these are optional
            descriptor.space = space || descriptor.space;
            descriptor.top = top;
            descriptor.left = left;
            // default to single cell ranges
            descriptor.height = height || 1;
            descriptor.width = width || 1;
            descriptor.class = className;
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };

    function regnerateCache() {
        cachedClassMatrix = [];
        api.getAll().forEach((descriptor) => {
            addOrRemoveCachedClass(descriptor);
        });
    }

    grid.eventLoop.bind('grid-row-change', regnerateCache);
    grid.eventLoop.bind('grid-col-change', regnerateCache);

    function addOrRemoveCachedClass(descriptor: ICellClassDescriptor, isRemove?: boolean) {
        const { top, left, height, width, space } = descriptor;
        const className = descriptor.class;
        if (top === undefined || height === undefined || left === undefined || width === undefined || className === undefined) {
            return;
        }
        for (let r = top; r < Math.min(top + height, grid.rowModel.length(true)); r++) {
            for (let c = left; c < Math.min(left + width, grid.colModel.length(true)); c++) {
                const spaceKey: keyof Grid = toStandardSpace(space);
                const vRow = grid[spaceKey].row.toVirtual(r);
                const vCol = grid[spaceKey].col.toVirtual(c);
                let cols = cachedClassMatrix[vRow];
                if (!cols) {
                    cols = cachedClassMatrix[vRow] = [];
                }
                const cellClasses = cols[vCol];
                if (!cellClasses) {
                    if (!isRemove) {
                        cols[vCol] = [className];
                    }
                    continue;
                }

                if (!isRemove) {
                    if (cellClasses.indexOf(className) === -1) {
                        cellClasses.push(className);
                    }
                } else {
                    const index = cellClasses.indexOf(className);
                    if (index !== -1) {
                        cellClasses.splice(index, 1);
                    }
                }
            }
        }
    }

    return api;
}

export default create;