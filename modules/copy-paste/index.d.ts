import { Grid } from '../core';
export interface ICopyPaste {
    _maybeSelectText(): void;
}
export declare function create(grid: Grid): ICopyPaste;
export default create;
