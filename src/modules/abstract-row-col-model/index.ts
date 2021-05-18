import { Grid } from '../core';
import { IGridDataChangeBody, IGridDataResult } from '../data-model';
import debounce from '../debounce';
import makeDirtyClean, { IDirtyClean } from '../dirty-clean';
import addDirtyProps from '../dirty-props';
import { IEditOptions } from '../edit-model';
import passThrough from '../pass-through';
import * as util from '../util';

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
  sizeOf(index: number): number;
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
  editOptions?: IEditOptions;
  data?: Array<IGridDataChangeBody<any>>;
}

export interface IRowDescriptor extends IRowColDescriptor {
  height?: number;
  children?: IRowDescriptor[];
}
export interface IColDescriptor extends IRowColDescriptor {
  width?: number;
  children?: IColDescriptor[];
}

export interface IBuilderUpdateContext {
  virtualCol: number;
  virtualRow: number;
  data: IGridDataResult<any>;
}
export interface IBuilderRenderContext {
  viewRow: number;
  viewCol: number;
  previousElement: HTMLElement | undefined;
}

export type BuilderRenderer = (context: IBuilderRenderContext) => HTMLElement | undefined;
export type BuilderUpdater = (builtElem: HTMLElement | undefined, context: IBuilderUpdateContext) => HTMLElement | void;

export interface IRowColBuilder {
  render: BuilderRenderer;
  update: BuilderUpdater;
  includeHeaders: boolean;
}

export interface IRowColEventBody {
  action: 'add' | 'remove' | 'move' | 'hide' | 'size';
  descriptors: IRowColDescriptor[];
  target?: undefined;
}

export interface IRowColEvent extends IRowColEventBody {
  type: string;
}

export class AbstractRowColModel {
  grid: Grid;
  defaultSize: number;
  areBuildersDirty: () => boolean;
  isDirty: () => boolean;
  private name: string;
  rangeStates: any[];
  private descriptors: IRowColDescriptor[] = [];
  private _numFixed: number = 0;
  private _numHeaders: number = 0;
  private dirtyClean: IDirtyClean;
  private builderDirtyClean: IDirtyClean;
  private _selected: number[] = [];
  private ROW_COL_EVENT_TYPE: string;
  private lengthName: string;
  private fireSelectionChange: () => void;
  constructor(
    grid: Grid,
    name: string,
    lengthName: string,
    defaultSize: number
  ) {
    this.grid = grid;
    this.name = name;
    this.dirtyClean = makeDirtyClean(grid);
    this.builderDirtyClean = makeDirtyClean(grid);
    this.areBuildersDirty = this.builderDirtyClean.isDirty;
    this.isDirty = this.dirtyClean.isDirty;
    this.ROW_COL_EVENT_TYPE = 'grid-' + name + '-change';
    this.defaultSize = defaultSize;
    this.lengthName = lengthName;
    this.fireSelectionChange = debounce(() => {
      grid.eventLoop.fire('grid-' + name + '-selection-change');
    }, 1);
  }

  add(_toAdd?: IRowColDescriptor | IRowColDescriptor[]) {
    if (!_toAdd) {
      return;
    }
    const toAdd = util.toArray(_toAdd);
    toAdd.forEach((descriptor) => {
      if (descriptor.header) {
        this.descriptors.splice(this._numHeaders, 0, descriptor);
        this._numFixed++;
        this._numHeaders++;
      } else {
        // if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
        if (descriptor.fixed) {
          if (!this.descriptors.length || this.descriptors[this.descriptors.length - 1].fixed) {
            this._numFixed++;
          } else {
            throw new Error('Cannot add a fixed column after an unfixed one');
          }
        }
        this.descriptors.push(descriptor);
      }
    });
    this.updateDescriptorIndices();
    this.setDescriptorsDirty({
      action: 'add',
      descriptors: toAdd
    });
  }
  addHeaders(_toAdd?: IRowColDescriptor | IRowColDescriptor[]) {
    if (!_toAdd) {
      return;
    }
    const toAdd = util.toArray(_toAdd);
    toAdd.forEach((headerDescriptor) => {
      headerDescriptor.header = true;
    });
    this.add(toAdd);
  }
  header(index: number) {
    return this.descriptors[index];
  }
  get(index: number, dataSpace?: boolean) {
    if (dataSpace) {
      index += this._numHeaders;
    }
    return this.descriptors[index];
  }
  length(includeHeaders?: boolean) {
    const subtract = includeHeaders ? 0 : this._numHeaders;
    return this.descriptors.length - subtract;
  }
  remove(descriptor: IRowColDescriptor, dontUpdateIndex?: boolean) {
    const index = this.descriptors.indexOf(descriptor);
    if (index !== -1) {
      this.descriptors.splice(index, 1);
      if (descriptor.header) {
        this._numFixed--;
        this._numHeaders--;
      } else if (descriptor.fixed) {
        this._numFixed--;
      }
    }
    if (!dontUpdateIndex) {
      this.updateDescriptorIndices();
      this.setDescriptorsDirty({
        action: 'remove',
        descriptors: [descriptor]
      });
    }
  }
  clear(includeHeaders?: boolean) {
    let removed;
    if (includeHeaders) {
      removed = this.descriptors;
      this.descriptors = [];
      this._numFixed = 0;
      this._numHeaders = 0;
    } else {
      removed = this.descriptors.slice(this._numHeaders);
      this.descriptors = this.descriptors.slice(0, this._numHeaders);
      this._numFixed = this._numHeaders;
    }
    this.updateDescriptorIndices();
    if (removed && removed.length) {
      this.setDescriptorsDirty({
        action: 'remove',
        descriptors: removed
      });
    }
  }
  move(_fromIndexes: number | number[], target: number, after?: boolean) {
    const fromIndexes = util.toArray(_fromIndexes);

    if (fromIndexes.length === 1) {
      // the single move case is easier and doesn't require the after hint
      const from = fromIndexes[0];
      this.descriptors.splice(target, 0, this.descriptors.splice(from, 1)[0]);
      this.setDescriptorsDirty({
        action: 'move',
        descriptors: [this.get(from), this.get(target)]
      });
    } else {
      while (fromIndexes.indexOf(target) !== -1 && target !== -1) {
        target--;
        after = true;
      }

      const toValue = this.descriptors[target];
      const removed = fromIndexes
        .sort((a, b) => b - a)
        .map((fromIndex) => {
          const removedDescriptors = this.descriptors.splice(fromIndex, 1);
          return removedDescriptors[0];

        });
      removed.reverse();
      this.descriptors.splice(this.descriptors.indexOf(toValue) + (after ? 1 : 0), 0, ...removed);
      this.updateDescriptorIndices();
      this.setDescriptorsDirty({
        action: 'move',
        descriptors: removed.concat(toValue)
      });
    }
  }
  numHeaders() {
    return this._numHeaders;
  }
  numFixed(excludeHeaders?: boolean) {
    return this._numFixed - (excludeHeaders ? this._numHeaders : 0);
  }
  toVirtual(dataIndex: number) {
    return dataIndex + this.numHeaders();
  }
  toData(virtualIndex: number) {
    return virtualIndex - this.numHeaders();
  }

  select(_indexes: number | number[], dontFire?: boolean) {
    const indexes = util.toArray(_indexes);
    const changes = indexes
      .filter((idx) => {
        const hasDescriptor = !!this.get(idx, true);
        if (!hasDescriptor) {
          console.warn('Tried to select index that had no descriptor', idx);
        }
        return hasDescriptor;
      })
      .map((idx) => {
        const descriptor = this.get(idx, true);
        if (!descriptor.selected && descriptor.selectable !== false) {
          this.addDragReadyClass(descriptor, idx);
          descriptor.selected = true;
          this._selected.push(idx);
          return idx;
        }
        return undefined;
      })
      .filter((c) => c != undefined) as number[];
    if (changes.length && !dontFire) {
      this.fireSelectionChange();
    }
  }
  deselect(_indexes: number | number[], dontFire?: boolean) {
    const indexes = util.toArray(_indexes);
    const selectedMap = this._selected.reduce<{ [key: string]: number | false }>((map, selectedIndex) => {
      map[selectedIndex] = selectedIndex;
      return map;
    }, {});
    const changes = indexes
      .filter((idx) => {
        const hasDescriptor = !!this.get(idx, true);
        if (!hasDescriptor) {
          console.warn('Tried to deselect index that had no descriptor', idx);
        }
        return hasDescriptor;
      })
      .map((idx) => {
        const descriptor = this.get(idx, true);
        this.removeDragReadyClass(descriptor);
        if (descriptor.selected) {
          descriptor.selected = false;
          selectedMap[idx] = false;
          return idx;
        }
        return undefined;
      })
      .filter((c) => c != undefined) as number[];

    this._selected =
      Object.keys(selectedMap)
        .reduce<number[]>((array, selectedKey) => {
          const idx = selectedMap[selectedKey];
          if (idx !== false) {
            array.push(idx);
          }
          return array;
        }, []);

    if (changes.length && !dontFire) {
      this.fireSelectionChange();
    }
  }
  toggleSelect(index: number) {
    const descriptor = this.get(index, true);
    if (descriptor.selected) {
      this.deselect(index);
    } else {
      this.select(index);
    }
  }
  clearSelected() {
    // have to make a copy or we are iterating the same array we're removing from yikes.
    return this.deselect(this.getSelected().slice(0));
  }
  getSelected() {
    return this._selected;
  }
  allSelected() {
    return this.getSelected().length === this.length();
  }
  create(builder?: IRowColBuilder) {
    let fixed: boolean | undefined = false;
    let expanded = false;
    let expandedClass: any; // TODO: cell class descriptor type
    const setExpanded = (exp: boolean) => {
      if (!descriptor.children || descriptor.index == undefined) {
        return;
      }
      expanded = exp;
      // we never look for changes to the children, if you need to change it, remove and add the row again
      if (expanded) {
        this.descriptors.splice(descriptor.index + 1, 0, ...descriptor.children);
        this.updateDescriptorIndices();
        this.setDescriptorsDirty({
          action: 'add',
          descriptors: descriptor.children
        });
        const top = this.name === 'row' ? descriptor.index : 0;
        const left = this.name === 'col' ? descriptor.index : 0;
        const height = this.name === 'row' ? 1 : Infinity;
        const width = this.name === 'col' ? 1 : Infinity;
        expandedClass = this.grid.cellClasses.create(top, left, 'grid-expanded', height, width, 'virtual');
        this.grid.cellClasses.add(expandedClass);

      } else {
        this.descriptors.splice(descriptor.index + 1, descriptor.children.length);
        this.updateDescriptorIndices();
        this.setDescriptorsDirty({
          action: 'remove',
          descriptors: [...descriptor.children]
        });
        if (expandedClass) {
          this.grid.cellClasses.remove(expandedClass);
        }
      }
    };
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
        setExpanded(exp);
      }
    };

    addDirtyProps(descriptor, ['builder'], [this.builderDirtyClean]);
    addDirtyProps(descriptor, [{
      name: 'data', onDirty: () => {
        this.grid.dataModel.setDirty();
      }
    }], []);
    descriptor.builder = builder;

    return addDirtyProps(descriptor, [{
      name: this.lengthName,
      onDirty: () => {
        this.setDescriptorsDirty({
          action: 'size',
          descriptors: [descriptor]
        });
      }
    }, {
      name: 'hidden',
      onDirty: () => {
        this.setDescriptorsDirty({
          action: 'hide',
          descriptors: [descriptor]
        });
      }
    }], [this.dirtyClean]);
  }
  createBuilder(render: BuilderRenderer, update: BuilderUpdater = passThrough, includeHeaders: boolean = false) {
    return {
      render,
      update,
      includeHeaders
    };
  }

  sizeOf(index: number) {
    const descriptor = this.get(index);
    if (!descriptor) {
      return NaN;
    }

    if (descriptor.hidden) {
      return 0;
    }

    const size: number | undefined = (descriptor as any)[this.lengthName];
    return size || this.defaultSize;
  }

  private setDescriptorsDirty(eventBody: IRowColEventBody) {
    // tslint:disable-next-line:prefer-object-spread
    const event: IRowColEvent = Object.assign(eventBody, {
      type: this.ROW_COL_EVENT_TYPE
    });
    this.grid.eventLoop.fire(event);
    this.dirtyClean.setDirty();
    this.builderDirtyClean.setDirty();
  }

  private updateDescriptorIndices() {
    const oldSelected = this._selected;
    this._selected = [];
    this.descriptors.forEach((descriptor, i) => {
      descriptor.index = i;
      if (descriptor.selected) {
        this._selected.push(i);
      }
    });
    if (this._selected.length !== oldSelected.length) {
      this.fireSelectionChange();
      return;
    }
    this._selected.sort();
    oldSelected.sort();
    const change = oldSelected.some((idx, i) => {
      return idx !== this._selected[i];
    });
    if (change) {
      this.fireSelectionChange();
    }
  }

  private addDragReadyClass(descriptor: IRowColDescriptor, index: number) {
    if (!descriptor || !(index >= 0)) {
      return;
    }
    const top = this.name === 'row' ? index : -1;
    const left = this.name === 'row' ? -1 : index;
    const dragReadyClass = this.grid.cellClasses.create(top, left, 'grid-col-drag-ready');
    this.grid.cellClasses.add(dragReadyClass);
    descriptor.dragReadyClass = dragReadyClass;
  }

  private removeDragReadyClass(descriptor: IRowColDescriptor) {
    if (!descriptor || !descriptor.dragReadyClass) {
      return;
    }
    this.grid.cellClasses.remove(descriptor.dragReadyClass);
    descriptor.dragReadyClass = undefined;
  }

  private compactAndSort() {
    this.rangeStates = this.rangeStates
      .slice()
      .sort((a, b) => a.start - b.start)
      .reduce((newRangeStates, rs) => {
        const last = newRangeStates.pop();

        if (!last) {
          return [...newRangeStates, rs];
        }

        if (last.end < rs.start) {
          return [...newRangeStates, last, rs];
        }

        if (last.end > rs.end) {
          return [...newRangeStates, last];
        }

        // overlapping ranges
        return [
          ...newRangeStates,
          {
            start: last.start,
            end: rs.end,
          }
        ];
      }, []);
  }
}

export function create(
  grid: Grid,
  name: string,
  lengthName: string,
  defaultSize: number
): IAbstractRowColModel {
  return new AbstractRowColModel(grid, name, lengthName, defaultSize);
}

export default create;