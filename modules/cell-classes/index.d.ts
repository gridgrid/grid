import { Grid } from '../core';
import { IDirtyClean } from '../dirty-clean';
import { IPartialPositionRange, PositionSpace } from '../position-range';
export interface ICellClassDescriptor extends IPartialPositionRange {
    _cellClassDirtyClean: IDirtyClean;
    class?: string;
}
export interface ICellClasses {
    add(descriptor: ICellClassDescriptor): void;
    remove(descriptor: ICellClassDescriptor): void;
    getAll(): ICellClassDescriptor[];
    getCachedClasses(vRow: number, vCol: number): string[];
    create(top?: number, left?: number, className?: string, height?: number, width?: number, space?: PositionSpace): ICellClassDescriptor;
    isDirty(): boolean;
}
export declare function create(grid: Grid): ICellClasses;
export default create;
