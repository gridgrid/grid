"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_clean_1 = require("../dirty-clean");
var nullResult = { value: null, formatted: '' };
var loadingResult = { value: null, formatted: 'Loading...' };
function create(grid, loadRows) {
    var dirtyClean = dirty_clean_1.default(grid);
    var getData = function (vR, vC) {
        var cachedRow = getCachedRow(vR);
        if (cachedRow) {
            return __assign({ formatted: '' }, cachedRow[vC]);
        }
        if (loadRows) {
            return grid.cols.converters.virtual.toData(vC) === 0 ?
                loadingResult :
                nullResult;
        }
        return nullResult;
    };
    var getCachedRow = function (vR) {
        var rowDescriptor = grid.rowModel.get(vR);
        return rowDescriptor && rowDescriptor.data;
    };
    function maybeLoadRows() {
        return __awaiter(this, void 0, void 0, function () {
            var extras, visibles, numVisibleRows, currentTopRow, currentBottomRow, row, toFetchSet, toFetch;
            return __generator(this, function (_a) {
                if (!loadRows) {
                    return [2];
                }
                extras = [];
                visibles = [];
                numVisibleRows = grid.viewPort.rows;
                currentTopRow = grid.cellScrollModel.row;
                currentBottomRow = currentTopRow + numVisibleRows;
                for (row = Math.max(0, currentTopRow - numVisibleRows); row < Math.min(currentBottomRow + 1 + numVisibleRows, grid.rows.converters.data.count()); row++) {
                    if (getCachedRow(grid.rows.converters.data.toVirtual(row))) {
                        continue;
                    }
                    if (row >= currentBottomRow) {
                        extras.push(row);
                    }
                    else {
                        visibles.push(row);
                    }
                }
                if (!extras.length && !visibles.length) {
                    return [2];
                }
                if (!visibles.length && extras.length < (numVisibleRows / 2)) {
                    return [2];
                }
                toFetchSet = new Set(visibles);
                extras.forEach(function (r) { return toFetchSet.add(r); });
                toFetch = Array.from(toFetchSet);
                if (!toFetch.length) {
                    return [2];
                }
                loadRows(toFetch);
                return [2];
            });
        });
    }
    grid.eventLoop.bind('grid-cell-scroll', function () {
        maybeLoadRows();
    });
    grid.eventLoop.bind('grid-viewport-change', function () {
        maybeLoadRows();
    });
    return {
        isDirty: dirtyClean.isDirty,
        setDirty: dirtyClean.setDirty,
        handleCachedDataChange: function () {
            dirtyClean.setDirty();
            maybeLoadRows();
        },
        get: function (dataRow, dataCol) {
            return getData(grid.rows.converters.data.toVirtual(dataRow), grid.cols.converters.data.toVirtual(dataCol));
        },
        getHeader: function (virtualRow, virtualCol) {
            return getData(virtualRow, virtualCol);
        },
        set: function (rowOrData, c, datum) {
            var data;
            if (!Array.isArray(rowOrData)) {
                if (typeof datum === 'string') {
                    datum = datum.replace('[rR]', '').replace('[cC]', '').split(' ');
                }
                data = [{
                        row: rowOrData,
                        col: c,
                        value: datum
                    }];
            }
            else {
                data = rowOrData;
            }
            data.forEach(function (change) {
                var rowDescriptor = grid.rowModel.get(grid.rows.converters.data.toVirtual(change.row));
                var rowData = rowDescriptor.data;
                if (!rowData) {
                    rowData = rowDescriptor.data = [];
                }
                rowData[grid.cols.converters.data.toVirtual(change.col)] = {
                    value: change.value,
                    formatted: change.formatted != undefined ? change.formatted : change.value,
                };
            });
        }
    };
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map