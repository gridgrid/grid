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
var ColModel = (function (_super) {
    __extends(ColModel, _super);
    function ColModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.width = function (idx) {
            return _this.sizeOf(idx);
        };
        _this.col = function (idx) {
            return _this.get(idx, true);
        };
        return _this;
    }
    return ColModel;
}(abstract_row_col_model_1.AbstractRowColModel));
exports.ColModel = ColModel;
function create(grid) {
    return new ColModel(grid, 'col', 'width', 100);
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map