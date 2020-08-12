"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var range_util_1 = require("../range-util");
var AbstractSpaceConverter = (function () {
    function AbstractSpaceConverter(grid) {
        var _this = this;
        this.grid = grid;
        this.up = function (i) { return _this.row.prev(i); };
        this.down = function (i) { return _this.row.next(i); };
        this.left = function (i) { return _this.col.prev(i); };
        this.right = function (i) { return _this.col.next(i); };
    }
    AbstractSpaceConverter.prototype.iterate = function () {
        var args = range_util_1.getArgs(arguments);
        var range = args.range;
        var rowFn = args.rowFn;
        var cellFn = args.cellFn;
        rowloop: for (var r = range.top; r !== undefined && r < range.top + range.height; r = this.row.next(r)) {
            var rowResult = void 0;
            if (rowFn) {
                rowResult = rowFn(r);
            }
            colloop: for (var c = range.left; c !== undefined && c < range.left + range.width; c = this.col.next(c)) {
                if (cellFn) {
                    var result = cellFn(r, c, rowResult);
                    if (result === false) {
                        break rowloop;
                    }
                    else if (result === true) {
                        break colloop;
                    }
                }
            }
        }
    };
    return AbstractSpaceConverter;
}());
exports.AbstractSpaceConverter = AbstractSpaceConverter;
//# sourceMappingURL=converter.js.map