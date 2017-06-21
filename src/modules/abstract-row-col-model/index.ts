import { Grid } from '@grid/core';
import * as util from '@grid/util';

const addDirtyProps = require('../add-dirty-props');
const passThrough = require('../pass-through');
const debounce = require('../debounce');

export interface IAbstractRowColModel {
    defaultSize: number;
    areBuildersDirty: () => boolean;
    isDirty: () => boolean;
    get(i: number): IRowColDescriptor;
    toVirtual(i: number): number;
    toData(i: number): number;
    length(includeHeaders?: boolean): number;
    header(index: number): IRowColDescriptor;
    add(d?: IRowColDescriptor | IRowColDescriptor[]): void;
    addHeaders(d?: IRowColDescriptor | IRowColDescriptor[]): void;
    remove(descriptor: IRowColDescriptor, dontUpdateIndex?: boolean): void;
    clear(includeHeaders?: boolean): void;
    move(fromIndexes: number | number[], target: number, after?: boolean): void;
    numHeaders(): number;
    numFixed(excludeHeaders?: boolean): number;
    select(indexes: number | number[], dontFire?: boolean): void;
    deselect(indexes: number | number[], dontFire?: boolean): void;
    toggleSelect(index: number): void;
    clearSelected(): void;
    getSelected(): number[];
    allSelected(): boolean;
    create(builder?: IRowColBuilder): IRowColDescriptor;
    createBuilder(render: BuilderRenderer, update?: BuilderUpdater): IRowColBuilder;
}

export interface IRowColDescriptor {
    expanded: boolean;
    isBuiltActionable: boolean;
    hidden?: boolean;
    index?: number;
    selected?: boolean;
    selectable?: boolean;
    header?: boolean;
    fixed?: boolean;
    dragReadyClass?: any; // a class descriptor
    builder?: IRowColBuilder;
    children?: IRowColDescriptor[];
}

export interface IRowDescriptor extends IRowColDescriptor {
    height?: number;
    children?: IRowDescriptor[];
}
export interface IColDescriptor extends IRowColDescriptor {
    width?: number;
    children?: IColDescriptor[];
}

export type BuilderRenderer = () => HTMLElement | undefined;
export type BuilderUpdater = () => HTMLElement | undefined;

export interface IRowColBuilder {
    render: BuilderRenderer;
    update: BuilderUpdater;
}

interface IRowColEventBody {
    action: 'add' | 'remove' | 'move' | 'hide' | 'size';
    descriptors: IRowColDescriptor[];
}

export interface IRowColEvent extends IRowColEventBody {
    type: string;
}

export default function (
    grid: Grid,
    name: string,
    lengthName: string,
    defaultSize: number
): IAbstractRowColModel {

    let descriptors: IRowColDescriptor[] = [];
    let numFixed = 0;
    let numHeaders = 0;
    const makeDirtyClean = require('../dirty-clean');
    const dirtyClean = makeDirtyClean(grid);
    const builderDirtyClean = makeDirtyClean(grid);
    let selected: number[] = [];
    const ROW_COL_EVENT_TYPE = 'grid-' + name + '-change';

    function setDescriptorsDirty(eventBody: IRowColEventBody) {
        // tslint:disable-next-line:prefer-object-spread
        const event: IRowColEvent = Object.assign(eventBody, {
            type: ROW_COL_EVENT_TYPE
        });
        grid.eventLoop.fire(event);
        dirtyClean.setDirty();
        builderDirtyClean.setDirty();
    }

    const fireSelectionChange = debounce(() => {
        grid.eventLoop.fire('grid-' + name + '-selection-change');
    }, 1);

    function updateDescriptorIndices() {
        const oldSelected = selected;
        selected = [];
        descriptors.forEach((descriptor, i) => {
            descriptor.index = i;
            if (descriptor.selected) {
                selected.push(i);
            }
        });
        if (selected.length !== oldSelected.length) {
            fireSelectionChange();
            return;
        }
        selected.sort();
        oldSelected.sort();
        const change = oldSelected.some((idx, i) => {
            return idx !== selected[i];
        });
        if (change) {
            fireSelectionChange();
        }
    }

    function addDragReadyClass(descriptor: IRowColDescriptor, index: number) {
        if (!descriptor || !(index >= 0)) {
            return;
        }
        const top = name === 'row' ? index : -1;
        const left = name === 'row' ? -1 : index;
        const dragReadyClass = grid.cellClasses.create(top, left, 'grid-col-drag-ready');
        grid.cellClasses.add(dragReadyClass);
        descriptor.dragReadyClass = dragReadyClass;
    }

    function removeDragReadyClass(descriptor: IRowColDescriptor) {
        if (!descriptor || !descriptor.dragReadyClass) {
            return;
        }
        grid.cellClasses.remove(descriptor.dragReadyClass);
        descriptor.dragReadyClass = undefined;
    }

    const api: IAbstractRowColModel = {
        areBuildersDirty: builderDirtyClean.isDirty,
        isDirty: dirtyClean.isDirty,
        defaultSize,
        add(_toAdd?: IRowColDescriptor | IRowColDescriptor[]) {
            if (!_toAdd) {
                return;
            }
            const toAdd = util.toArray(_toAdd);
            toAdd.forEach((descriptor) => {
                if (descriptor.header) {
                    descriptors.splice(numHeaders, 0, descriptor);
                    numFixed++;
                    numHeaders++;
                } else {
                    // if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
                    if (descriptor.fixed) {
                        if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
                            numFixed++;
                        } else {
                            throw new Error('Cannot add a fixed column after an unfixed one');
                        }
                    }
                    descriptors.push(descriptor);
                }
            });
            updateDescriptorIndices();
            setDescriptorsDirty({
                action: 'add',
                descriptors: toAdd
            });
        },
        addHeaders(_toAdd?: IRowColDescriptor | IRowColDescriptor[]) {
            if (!_toAdd) {
                return;
            }
            const toAdd = util.toArray(_toAdd);
            toAdd.forEach((headerDescriptor) => {
                headerDescriptor.header = true;
            });
            api.add(toAdd);
        },
        header(index: number) {
            return descriptors[index];
        },
        get(index: number) {
            return descriptors[index];
        },
        length(includeHeaders?: boolean) {
            const subtract = includeHeaders ? 0 : numHeaders;
            return descriptors.length - subtract;
        },
        remove(descriptor: IRowColDescriptor, dontUpdateIndex?: boolean) {
            const index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                if (descriptor.header) {
                    numFixed--;
                    numHeaders--;
                } else if (descriptor.fixed) {
                    numFixed--;
                }
            }
            if (!dontUpdateIndex) {
                updateDescriptorIndices();
                setDescriptorsDirty({
                    action: 'remove',
                    descriptors: [descriptor]
                });
            }
        },
        clear(includeHeaders?: boolean) {
            let removed;
            if (includeHeaders) {
                removed = descriptors;
                descriptors = [];
                numFixed = 0;
                numHeaders = 0;
            } else {
                removed = descriptors.slice(numHeaders);
                descriptors = descriptors.slice(0, numHeaders);
                numFixed = numHeaders;
            }
            updateDescriptorIndices();
            if (removed && removed.length) {
                setDescriptorsDirty({
                    action: 'remove',
                    descriptors: removed
                });
            }
        },
        move(_fromIndexes: number | number[], target: number, after?: boolean) {
            const fromIndexes = util.toArray(_fromIndexes);

            if (fromIndexes.length === 1) {
                // the single move case is easier and doesn't require the after hint
                const from = fromIndexes[0];
                descriptors.splice(target, 0, descriptors.splice(from, 1)[0]);
                setDescriptorsDirty({
                    action: 'move',
                    descriptors: [api.get(from), api.get(target)]
                });
            } else {
                while (fromIndexes.indexOf(target) !== -1 && target !== -1) {
                    target--;
                    after = true;
                }

                const toValue = descriptors[target];
                const removed = fromIndexes
                    .sort((a, b) => b - a)
                    .map((fromIndex) => {
                        const removedDescriptors = descriptors.splice(fromIndex, 1);
                        return removedDescriptors[0];

                    });
                removed.reverse();
                descriptors.splice(descriptors.indexOf(toValue) + (after ? 1 : 0), 0, ...removed);
                updateDescriptorIndices();
                setDescriptorsDirty({
                    action: 'move',
                    descriptors: removed.concat(toValue)
                });
            }
        },
        numHeaders() {
            return numHeaders;
        },
        numFixed(excludeHeaders?: boolean) {
            return numFixed - (excludeHeaders ? numHeaders : 0);
        },
        toVirtual(dataIndex: number) {
            return dataIndex + api.numHeaders();
        },
        toData(virtualIndex: number) {
            return virtualIndex - api.numHeaders();
        },

        select(_indexes: number | number[], dontFire?: boolean) {
            const indexes = util.toArray(_indexes);
            const changes = indexes
                .filter((idx) => {
                    const hasDescriptor = !!rowOrCol(idx);
                    if (!hasDescriptor) {
                        console.warn('Tried to select index that had no descriptor', idx);
                    }
                    return hasDescriptor;
                })
                .map((idx) => {
                    const descriptor = rowOrCol(idx);
                    if (!descriptor.selected && descriptor.selectable !== false) {
                        addDragReadyClass(descriptor, idx);
                        descriptor.selected = true;
                        selected.push(idx);
                        return idx;
                    }
                    return undefined;
                })
                .filter((c) => c != undefined) as number[];
            if (changes.length && !dontFire) {
                fireSelectionChange();
            }
        },
        deselect(_indexes: number | number[], dontFire?: boolean) {
            const indexes = util.toArray(_indexes);
            const selectedMap = selected.reduce<{ [key: string]: number | false }>((map, selectedIndex) => {
                map[selectedIndex] = selectedIndex;
                return map;
            }, {});
            const changes = indexes
                .filter((idx) => {
                    const hasDescriptor = !!rowOrCol(idx);
                    if (!hasDescriptor) {
                        console.warn('Tried to deselect index that had no descriptor', idx);
                    }
                    return hasDescriptor;
                })
                .map((idx) => {
                    const descriptor = rowOrCol(idx);
                    removeDragReadyClass(descriptor);
                    if (descriptor.selected) {
                        descriptor.selected = false;
                        selectedMap[idx] = false;
                        return idx;
                    }
                    return undefined;
                })
                .filter((c) => c != undefined) as number[];

            selected =
                Object.keys(selectedMap)
                    .reduce<number[]>((array, selectedKey) => {
                        const idx = selectedMap[selectedKey];
                        if (idx !== false) {
                            array.push(idx);
                        }
                        return array;
                    }, []);

            if (changes.length && !dontFire) {
                fireSelectionChange();
            }
        },
        toggleSelect(index: number) {
            const descriptor = rowOrCol(index);
            if (descriptor.selected) {
                api.deselect(index);
            } else {
                api.select(index);
            }
        },
        clearSelected() {
            // have to make a copy or we are iterating the same array we're removing from yikes.
            return api.deselect(api.getSelected().slice(0));
        },
        getSelected() {
            return selected;
        },
        allSelected() {
            return api.getSelected().length === api.length();
        },
        create(builder?: IRowColBuilder) {
            let fixed: boolean | undefined = false;
            let expanded = false;
            let expandedClass: any; // TODO: cell class descriptor type
            const descriptor: IRowColDescriptor = {
                isBuiltActionable: true,
                get fixed() {
                    return descriptor.header || !!fixed;
                },
                set fixed(_fixed: boolean | undefined) {
                    fixed = _fixed;
                },
                get expanded() {
                    return expanded;
                },
                set expanded(exp: boolean) {
                    if (!descriptor.children || descriptor.index == undefined) {
                        return;
                    }
                    expanded = exp;
                    // we never look for changes to the children, if you need to change it, remove and add the row again
                    if (expanded) {
                        descriptors.splice(descriptor.index + 1, 0, ...descriptor.children);
                        updateDescriptorIndices();
                        setDescriptorsDirty({
                            action: 'add',
                            descriptors: descriptor.children
                        });
                        const top = name === 'row' ? descriptor.index : 0;
                        const left = name === 'col' ? descriptor.index : 0;
                        const height = name === 'row' ? 1 : Infinity;
                        const width = name === 'col' ? 1 : Infinity;
                        expandedClass = grid.cellClasses.create(top, left, 'grid-expanded', height, width, 'virtual');
                        grid.cellClasses.add(expandedClass);

                    } else {
                        descriptors.splice(descriptor.index + 1, descriptor.children.length);
                        updateDescriptorIndices();
                        setDescriptorsDirty({
                            action: 'remove',
                            descriptors: [...descriptor.children]
                        });
                        if (expandedClass) {
                            grid.cellClasses.remove(expandedClass);
                        }
                    }
                }
            };

            addDirtyProps(descriptor, ['builder'], [builderDirtyClean]);
            descriptor.builder = builder;

            return addDirtyProps(descriptor, [{
                name: lengthName,
                onDirty() {
                    setDescriptorsDirty({
                        action: 'size',
                        descriptors: [descriptor]
                    });
                }
            }, {
                name: 'hidden',
                onDirty() {
                    setDescriptorsDirty({
                        action: 'hide',
                        descriptors: [descriptor]
                    });
                }
            }], [dirtyClean]);
        },
        createBuilder(render: BuilderRenderer, update: BuilderUpdater = passThrough) {
            return {
                render,
                update
            };
        }

    };

    function heightOrWidth(index: number) {
        const descriptor = descriptors[index];
        if (!descriptor) {
            return NaN;
        }

        if (descriptor.hidden) {
            return 0;
        }

        const size: number | undefined = (descriptor as any)[lengthName];
        return size || api.defaultSize;
    }

    function rowOrCol(index: number) {
        return descriptors[index + numHeaders];
    }

    // basically height or width
    (api as any)[lengthName] = heightOrWidth;

    // row or col get
    (api as any)[name] = rowOrCol;

    return api;
}