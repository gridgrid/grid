"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("../util");
var AbstractDimensionalSpaceConverter = (function () {
    function AbstractDimensionalSpaceConverter(gridDimension) {
        this.gridDimension = gridDimension;
    }
    AbstractDimensionalSpaceConverter.prototype.clamp = function (idx) {
        return util.clamp(idx, 0, this.count() - 1);
    };
    AbstractDimensionalSpaceConverter.prototype.prev = function (coord) {
        return this.iterateWhileHidden(-1, coord);
    };
    AbstractDimensionalSpaceConverter.prototype.next = function (coord) {
        return this.iterateWhileHidden(1, coord);
    };
    AbstractDimensionalSpaceConverter.prototype.get = function (coord) {
        return this.gridDimension.rowColModel.get(this.toVirtual(coord));
    };
    AbstractDimensionalSpaceConverter.prototype.indexes = function (opts) {
        if (opts === void 0) { opts = {}; }
        opts.from = opts.from || 0;
        var count = this.count();
        opts.to = (opts.to && opts.to + 1) ||
            (opts.length && opts.length + opts.from) ||
            count;
        var indexes = [];
        for (var idx = Math.max(opts.from, 0); idx != undefined && idx < Math.min(opts.to, count); idx = opts.reverse ? this.prev(idx) : this.next(idx)) {
            indexes.push(idx);
        }
        return indexes;
    };
    AbstractDimensionalSpaceConverter.prototype.iterate = function () {
        var opts;
        var fn;
        if (arguments.length === 2) {
            opts = arguments[0];
            fn = arguments[1];
        }
        else {
            fn = arguments[0];
        }
        this.indexes(opts).some(function (idx) {
            return !!fn(idx);
        });
    };
    AbstractDimensionalSpaceConverter.prototype.iterateWhileHidden = function (step, start) {
        if (step === void 0) { step = 1; }
        for (var i = start + step; i < this.count() && i >= 0; i += step) {
            if (!this.get(i).hidden) {
                return i;
            }
        }
        return undefined;
    };
    return AbstractDimensionalSpaceConverter;
}());
exports.AbstractDimensionalSpaceConverter = AbstractDimensionalSpaceConverter;
//# sourceMappingURL=dimensional-converter.js.map