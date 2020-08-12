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
var ViewSpaceConverter = (function (_super) {
    __extends(ViewSpaceConverter, _super);
    function ViewSpaceConverter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.row = new DimensionalViewSpaceConverter(_this.grid.rows);
        _this.col = new DimensionalViewSpaceConverter(_this.grid.cols);
        return _this;
    }
    return ViewSpaceConverter;
}(converter_1.AbstractSpaceConverter));
exports.ViewSpaceConverter = ViewSpaceConverter;
var DimensionalViewSpaceConverter = (function (_super) {
    __extends(DimensionalViewSpaceConverter, _super);
    function DimensionalViewSpaceConverter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DimensionalViewSpaceConverter.prototype.toView = function (i) {
        return i;
    };
    DimensionalViewSpaceConverter.prototype.toData = function (viewCol) {
        return this.gridDimension.converters.virtual.toData(this.toVirtual(viewCol));
    };
    DimensionalViewSpaceConverter.prototype.toVirtual = function (viewCol) {
        return this.gridDimension.viewPort.toVirtual(viewCol);
    };
    DimensionalViewSpaceConverter.prototype.count = function () {
        return this.gridDimension.viewPort.count;
    };
    return DimensionalViewSpaceConverter;
}(dimensional_converter_1.AbstractDimensionalSpaceConverter));
//# sourceMappingURL=view-space-converter.js.map