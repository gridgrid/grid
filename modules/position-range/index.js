"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_props_1 = require("../dirty-props");
var WATCHED_PROP_NAMES = ['top', 'left', 'height', 'width', 'units', 'space'];
exports.toStandardSpace = function (space) {
    if (space === 'real') {
        return 'view';
    }
    return space;
};
var getTop = function (range) {
    return range.top;
};
var setTop = function (range, p) {
    range.top = p;
    return range;
};
var getHeight = function (range) {
    return range.height;
};
var setHeight = function (range, s) {
    range.height = s;
    return range;
};
var getLeft = function (range) {
    return range.left;
};
var setLeft = function (range, p) {
    range.left = p;
    return range;
};
var getWidth = function (range) {
    return range.width;
};
var setWidth = function (range, s) {
    range.width = s;
    return range;
};
exports.rowPositionRangeDimension = {
    getPosition: getTop,
    getSize: getHeight,
    setPosition: setTop,
    setSize: setHeight,
};
exports.colPositionRangeDimension = {
    getPosition: getLeft,
    getSize: getWidth,
    setPosition: setLeft,
    setSize: setWidth,
};
function mixin(range, dirtyClean, parentDirtyClean, propOpts) {
    range = range || {};
    var rangeResult = Object.assign(range, {
        isDirty: dirtyClean.isDirty,
        units: 'cell',
        space: 'data',
    });
    rangeResult._positionRangeDirtyClean = dirtyClean;
    var watchedProperties = WATCHED_PROP_NAMES;
    if (propOpts) {
        watchedProperties = WATCHED_PROP_NAMES.map(function (propName) {
            return {
                name: propName,
                onDirty: propOpts.onDirty,
                preDirty: propOpts.preDirty
            };
        });
    }
    var dirtyCleans = [dirtyClean];
    if (parentDirtyClean) {
        dirtyCleans.push(parentDirtyClean);
    }
    dirty_props_1.default(rangeResult, watchedProperties, dirtyCleans);
    return rangeResult;
}
exports.mixin = mixin;
exports.default = mixin;
//# sourceMappingURL=index.js.map