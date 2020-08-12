"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var abstract_row_col_model_1 = require("../abstract-row-col-model");
var RowModel = (function (_super) {
    __extends(RowModel, _super);
    function RowModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.height = function (idx) {
            return _this.sizeOf(idx);
        };
        _this.row = function (idx) {
            return _this.get(idx, true);
        };
        return _this;
    }
    return RowModel;
}(abstract_row_col_model_1.AbstractRowColModel));
exports.RowModel = RowModel;
function create(grid) {
    return new RowModel(grid, 'row', 'height', 30);
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map