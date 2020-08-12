"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timeNow = require('time-now');
function create(grid) {
    var frames = [];
    var totalTime = 0;
    var totalFrames = 0;
    var totalWindowTime = 0;
    var lastLoopTime;
    var filteredFrameTime = 0;
    var filterStrength = 20;
    var belowThresholdCount = 0;
    var numCalcs = 0;
    var filteredAverage;
    var requestId;
    function addFrameToWindow(frameLength) {
        if (typeof frameLength !== 'number' || isNaN(frameLength)) {
            console.warn('passed non number to fps.addFrame()');
            return;
        }
        if (frames.length > fps.windowSize) {
            var frame = frames.shift();
            if (frame !== undefined) {
                totalWindowTime -= frame;
            }
        }
        totalWindowTime += frameLength;
        totalTime += frameLength;
        totalFrames++;
        frames.push(frameLength);
    }
    grid.eventLoop.bind('grid-destroy', function () {
        if (requestId) {
            cancelAnimationFrame(requestId);
            requestId = undefined;
        }
    });
    var fps = {
        threshold: 20,
        windowSize: 60,
        slowCount: 0,
        logging: false,
        allAverages: false,
        markFrameTime: function () {
            var nowTime = timeNow();
            if (lastLoopTime) {
                var frameLength = nowTime - lastLoopTime;
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
        getMovingAverage: function () {
            return totalWindowTime / frames.length;
        },
        getAllTimeAverage: function () {
            return totalTime / totalFrames;
        },
        getLast: function () {
            return frames[frames.length - 1];
        },
        getFilteredAverage: function () {
            return filteredAverage;
        },
        intervalId: window.setInterval(function () {
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
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map