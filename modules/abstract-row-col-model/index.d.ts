import { Grid } from '../core';
import { IGridDataChangeBody, IGridDataResult } from '../data-model';
import { IEditOptions } from '../edit-model';
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
    dragReadyClass?: any;
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
export declare type BuilderRenderer = (context: IBuilderRenderContext) => HTMLElement | undefined;
export declare type BuilderUpdater = (builtElem: HTMLElement | undefined, context: IBuilderUpdateContext) => HTMLElement | void;
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
export declare class AbstractRowColModel {
    grid: Grid;
    defaultSize: number;
    areBuildersDirty: () => boolean;
    isDirty: () => boolean;
    private name;
    rangeStates: any[];
    private descriptors;
    private _numFixed;
    private _numHeaders;
    private dirtyClean;
    private builderDirtyClean;
    private _selected;
    private ROW_COL_EVENT_TYPE;
    private lengthName;
    private fireSelectionChange;
    constructor(grid: Grid, name: string, lengthName: string, defaultSize: number);
    add(_toAdd?: IRowColDescriptor | IRowColDescriptor[]): void;
    addHeaders(_toAdd?: IRowColDescriptor | IRowColDescriptor[]): void;
    header(index: number): IRowColDescriptor;
    get(index: number, dataSpace?: boolean): IRowColDescriptor;
    length(includeHeaders?: boolean): number;
    remove(descriptor: IRowColDescriptor, dontUpdateIndex?: boolean): void;
    clear(includeHeaders?: boolean): void;
    move(_fromIndexes: number | number[], target: number, after?: boolean): void;
    numHeaders(): number;
    numFixed(excludeHeaders?: boolean): number;
    toVirtual(dataIndex: number): number;
    toData(virtualIndex: number): number;
    select(_indexes: number | number[], dontFire?: boolean): void;
    deselect(_indexes: number | number[], dontFire?: boolean): void;
    toggleSelect(index: number): void;
    clearSelected(): void;
    getSelected(): number[];
    allSelected(): boolean;
    create(builder?: IRowColBuilder): IRowColDescriptor;
    createBuilder(render: BuilderRenderer, update?: BuilderUpdater, includeHeaders?: boolean): {
        render: BuilderRenderer;
        update: BuilderUpdater;
        includeHeaders: boolean;
    };
    sizeOf(index: number): number;
    private setDescriptorsDirty;
    private updateDescriptorIndices;
    private addDragReadyClass;
    private removeDragReadyClass;
    private compactAndSort;
}
export declare function create(grid: Grid, name: string, lengthName: string, defaultSize: number): IAbstractRowColModel;
export default create;
