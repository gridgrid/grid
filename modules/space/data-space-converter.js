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
var converter_1 = require("./converter");
var dimensional_converter_1 = require("./dimensional-converter");
var DataSpaceConverter = (function (_super) {
    __extends(DataSpaceConverter, _super);
    function DataSpaceConverter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.row = new DimensionalDataSpaceConverter(_this.grid.rows);
        _this.col = new DimensionalDataSpaceConverter(_this.grid.cols);
        return _this;
    }
    return DataSpaceConverter;
}(converter_1.AbstractSpaceConverter));
exports.DataSpaceConverter = DataSpaceConverter;
var DimensionalDataSpaceConverter = (function (_super) {
    __extends(DimensionalDataSpaceConverter, _super);
    function DimensionalDataSpaceConverter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DimensionalDataSpaceConverter.prototype.toData = function (i) {
        return i;
    };
    DimensionalDataSpaceConverter.prototype.toVirtual = function (dataCol) {
        return this.gridDimension.rowColModel.toVirtual(dataCol);
    };
    DimensionalDataSpaceConverter.prototype.count = function () {
        return this.gridDimension.rowColModel.length();
    };
    DimensionalDataSpaceConverter.prototype.toView = function (dataCol) {
        return this.gridDimension.converters.virtual.toView(this.toVirtual(dataCol));
    };
    return DimensionalDataSpaceConverter;
}(dimensional_converter_1.AbstractDimensionalSpaceConverter));
//# sourceMappingURL=data-space-converter.js.map