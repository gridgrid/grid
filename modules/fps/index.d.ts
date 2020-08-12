import { Grid } from '../core';
export interface IFps {
    threshold: number;
    windowSize: number;
    slowCount: number;
    intervalId: number;
    percentBelowThreshold?: number;
    allAverages: boolean;
    logging: boolean;
    markFrameTime(): void;
    getMovingAverage(): number;
    getAllTimeAverage(): number;
    getLast(): number | undefined;
    getFilteredAverage(): number | undefined;
}
export declare function create(grid: Grid): IFps;
export default create;
