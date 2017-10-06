import { Grid } from '../core';

const timeNow = require('time-now');

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

export function create(grid: Grid) {

    const frames: number[] = [];
    let totalTime = 0;
    let totalFrames = 0;
    let totalWindowTime = 0;
    let lastLoopTime: number | undefined;
    let filteredFrameTime = 0;
    const filterStrength = 20;
    let belowThresholdCount = 0;
    let numCalcs = 0;
    let filteredAverage: number | undefined;
    let requestId: number | undefined;

    function addFrameToWindow(frameLength: number) {
        if (typeof frameLength !== 'number' || isNaN(frameLength)) {
            console.warn('passed non number to fps.addFrame()');
            return;
        }
        if (frames.length > fps.windowSize) {
            const frame = frames.shift();
            if (frame !== undefined) {
                totalWindowTime -= frame;
            }
        }
        totalWindowTime += frameLength;
        totalTime += frameLength;
        totalFrames++;
        frames.push(frameLength);
    }

    grid.eventLoop.bind('grid-destroy', () => {
        if (requestId) {
            cancelAnimationFrame(requestId);
            requestId = undefined;
        }
    });

    const fps: IFps = {
        threshold: 20,
        windowSize: 60,
        slowCount: 0,
        logging: false,
        allAverages: false,
        markFrameTime() {
            const nowTime = timeNow();
            if (lastLoopTime) {
                const frameLength = nowTime - lastLoopTime;
                filteredFrameTime += (frameLength - filteredFrameTime) / filterStrength;
                filteredAverage = 1000 / filteredFrameTime;
                if (filteredAverage < fps.threshold) {
                    belowThresholdCount++;
                }
                if (fps.allAverages) {
                    addFrameToWindow(1000 / frameLength);
                }
                numCalcs++;
            }
            lastLoopTime = nowTime;
        },
        getMovingAverage() {
            return totalWindowTime / frames.length;
        },
        getAllTimeAverage() {
            return totalTime / totalFrames;
        },
        getLast() {
            return frames[frames.length - 1];
        },
        getFilteredAverage() {
            return filteredAverage;
        },
        intervalId: window.setInterval(() => {
            fps.percentBelowThreshold = belowThresholdCount / numCalcs * 100;
            if (fps.percentBelowThreshold > 50) {
                fps.slowCount++;
            }
            if (fps.logging) {
                console.log('percent below threshold', fps.percentBelowThreshold.toFixed(1), 'filtered average', fps.getFilteredAverage());
            }
            belowThresholdCount = 0;
            numCalcs = 0;
        }, 1000)
    };

    function fpsMeasure() {
        if (grid.destroyed) {
            return;
        }
        requestId = requestAnimationFrame(fpsMeasure);
        fps.markFrameTime();
    }
    fpsMeasure();

    return fps;
}

export default create;