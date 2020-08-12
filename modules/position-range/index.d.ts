import { IDirtyClean } from '../dirty-clean';
import { IDirtyProp } from '../dirty-props';
export declare type IDirtyPropOpts = Pick<IDirtyProp, 'preDirty' | 'onDirty'>;
export declare type PositionUnit = 'cell' | 'px';
export declare type PositionSpace = 'data' | 'virtual' | 'real';
export declare const toStandardSpace: (space: PositionSpace) => "data" | "view" | "virtual";
export interface IRawPositionRange {
    top: number;
    left: number;
    height: number;
    width: number;
}
export declare type RawPositionRange = IRawPositionRange;
export declare type PartialRawPositionRange = Partial<IRawPositionRange>;
export declare type RawPositionRangeUnion = RawPositionRange | PartialRawPositionRange;
export interface IPartialPositionRange extends PartialRawPositionRange {
    units: PositionUnit;
    space: PositionSpace;
    isDirty(): boolean;
}
export declare type PositionType<T extends RawPositionRangeUnion> = T['top'];
export declare type SizeType<T extends RawPositionRangeUnion> = T['height'];
export declare type PositionGet = <T extends RawPositionRangeUnion>(r: T) => PositionType<T>;
export declare type PositionSet = <T extends RawPositionRangeUnion>(r: T, p: PositionType<T>) => T;
export declare type SizeGet = <T extends RawPositionRangeUnion>(r: T) => SizeType<T>;
export declare type SizeSet = <T extends RawPositionRangeUnion>(r: T, p: SizeType<T>) => T;
export interface IPositionRangeDimension {
    getPosition: PositionGet;
    setPosition: PositionSet;
    getSize: SizeGet;
    setSize: SizeSet;
}
export declare const rowPositionRangeDimension: IPositionRangeDimension;
export declare const colPositionRangeDimension: IPositionRangeDimension;
export declare function mixin<T extends object>(range: T, dirtyClean: IDirtyClean, parentDirtyClean?: IDirtyClean, propOpts?: IDirtyPropOpts): IPartialPositionRange & T;
export default mixin;
