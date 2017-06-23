import { IDirtyClean } from '@grid/dirty-clean';
import addDirtyProps, { DirtyProp, IDirtyProp } from '@grid/dirty-props';

export type IDirtyPropOpts = Pick<IDirtyProp, 'preDirty' | 'onDirty'>;
const WATCHED_PROP_NAMES = ['top', 'left', 'height', 'width', 'units', 'space'];

export type IPositionUnit = 'cell' | 'px';
export type IPositionSpace = 'data' | 'virtual' | 'real';

export interface IPositionRange {
    top?: number;
    left?: number;
    height?: number;
    width?: number;
    units: IPositionUnit;
    space: IPositionSpace;
    isDirty(): void;
}

export function mixin<T extends object>(
    range: T,
    dirtyClean: IDirtyClean,
    parentDirtyClean?: IDirtyClean,
    propOpts?: IDirtyPropOpts
) {
    range = range || {}; // allow mixin functionality
    // tslint:disable-next-line:prefer-object-spread
    const rangeResult: IPositionRange = Object.assign(range, {
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
