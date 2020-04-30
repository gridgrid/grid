import { IDirtyClean } from '../dirty-clean';
import addDirtyProps, { DirtyProp, IDirtyProp } from '../dirty-props';

export type IDirtyPropOpts = Pick<IDirtyProp, 'preDirty' | 'onDirty'>;
const WATCHED_PROP_NAMES = ['top', 'left', 'height', 'width', 'units', 'space'];

export type PositionUnit = 'cell' | 'px';
export type PositionSpace = 'data' | 'virtual' | 'real';

export const toStandardSpace = (space: PositionSpace) => {
  if (space === 'real') {
    return 'view';
  }
  return space;
};

export interface IRawPositionRange {
  top: number;
  left: number;
  height: number;
  width: number;
}

export type RawPositionRange = IRawPositionRange;
export type PartialRawPositionRange = Partial<IRawPositionRange>;
export type RawPositionRangeUnion = RawPositionRange | PartialRawPositionRange;

export interface IPartialPositionRange extends PartialRawPositionRange {
  units: PositionUnit;
  space: PositionSpace;
  isDirty(): boolean;
}

// not the sexiest but we get the position type assuming top / left width / height are the same type
export type PositionType<T extends RawPositionRangeUnion> = T['top'];
export type SizeType<T extends RawPositionRangeUnion> = T['height'];
export type PositionGet = <T extends RawPositionRangeUnion>(r: T) => PositionType<T>;
export type PositionSet = <T extends RawPositionRangeUnion>(r: T, p: PositionType<T>) => T;
export type SizeGet = <T extends RawPositionRangeUnion>(r: T) => SizeType<T>;
export type SizeSet = <T extends RawPositionRangeUnion>(r: T, p: SizeType<T>) => T;

export interface IPositionRangeDimension {
  getPosition: PositionGet;
  setPosition: PositionSet;
  getSize: SizeGet;
  setSize: SizeSet;
}

const getTop = <T extends RawPositionRangeUnion>(range: T) => {
  return range.top;
};

const setTop = <T extends RawPositionRangeUnion>(range: T, p: number) => {
  range.top = p;
  return range;
};

const getHeight = <T extends RawPositionRangeUnion>(range: T) => {
  return range.height;
};

const setHeight = <T extends RawPositionRangeUnion>(range: T, s: number) => {
  range.height = s;
  return range;
};

const getLeft = <T extends RawPositionRangeUnion>(range: T) => {
  return range.left;
};
const setLeft = <T extends RawPositionRangeUnion>(range: T, p: number) => {
  range.left = p;
  return range;
};

const getWidth = <T extends RawPositionRangeUnion>(range: T) => {
  return range.width;
};

const setWidth = <T extends RawPositionRangeUnion>(range: T, s: number) => {
  range.width = s;
  return range;
};

export const rowPositionRangeDimension: IPositionRangeDimension = {
  getPosition: getTop,
  getSize: getHeight,
  setPosition: setTop,
  setSize: setHeight,
};

export const colPositionRangeDimension: IPositionRangeDimension = {
  getPosition: getLeft,
  getSize: getWidth,
  setPosition: setLeft,
  setSize: setWidth,
};

export function mixin<T extends object>(
  range: T,
  dirtyClean: IDirtyClean,
  parentDirtyClean?: IDirtyClean,
  propOpts?: IDirtyPropOpts
) {
  range = range || {}; // allow mixin functionality
  // tslint:disable-next-line:prefer-object-spread
  const rangeResult: IPartialPositionRange & T = Object.assign(range, {
    isDirty: dirtyClean.isDirty,
    // defaults
    units: 'cell' as 'cell',
    space: 'data' as 'data',
  });

  (rangeResult as any)._positionRangeDirtyClean = dirtyClean;

  let watchedProperties: DirtyProp[] = WATCHED_PROP_NAMES;
  if (propOpts) {
    watchedProperties = WATCHED_PROP_NAMES.map((propName) => {
      return {
        name: propName,
        onDirty: propOpts.onDirty,
        preDirty: propOpts.preDirty
      };
    });
  }
  const dirtyCleans = [dirtyClean];
  if (parentDirtyClean) {
    dirtyCleans.push(parentDirtyClean);
  }

  addDirtyProps(rangeResult, watchedProperties, dirtyCleans);

  return rangeResult;
}

export default mixin;
