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
var VirtualSpaceConverter = (function (_super) {
    __extends(VirtualSpaceConverter, _super);
    function VirtualSpaceConverter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.row = new DimensionalVirtualSpaceConverter(_this.grid.rows);
        _this.col = new DimensionalVirtualSpaceConverter(_this.grid.cols);
        return _this;
    }
    return VirtualSpaceConverter;
}(converter_1.AbstractSpaceConverter));
exports.VirtualSpaceConverter = VirtualSpaceConverter;
var DimensionalVirtualSpaceConverter = (function (_super) {
    __extends(DimensionalVirtualSpaceConverter, _super);
    function DimensionalVirtualSpaceConverter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DimensionalVirtualSpaceConverter.prototype.toVirtual = function (i) {
        return i;
    };
    DimensionalVirtualSpaceConverter.prototype.toData = function (virtualCol) {
        return this.gridDimension.rowColModel.toData(virtualCol);
    };
    DimensionalVirtualSpaceConverter.prototype.count = function () {
        return this.gridDimension.rowColModel.length(true);
    };
    DimensionalVirtualSpaceConverter.prototype.toView = function (virtualRow) {
        return this.gridDimension.viewPort.toReal(virtualRow);
    };
    return DimensionalVirtualSpaceConverter;
}(dimensional_converter_1.AbstractDimensionalSpaceConverter));
//# sourceMappingURL=virtual-space-converter.js.map