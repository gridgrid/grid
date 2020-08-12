import { Grid } from '../core';
export interface IDirtyClean {
    isDirty(): boolean;
    isClean(): boolean;
    setDirty(): void;
    setClean(): void;
    disable(): void;
    enable(): void;
}
export declare function create(grid: Grid): IDirtyClean;
export default create;
