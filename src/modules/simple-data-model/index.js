var util = require('../util');

module.exports = function(_grid) {
    var grid = _grid;

    var cellData = [];
    var headerData = [];
    var sortedCol;
    var ascending;
    var dirtyClean = require('../dirty-clean')(grid);
    var internalSet = function(data, r, c, datum) {
        if (!data[r]) {
            data[r] = [];
        }
        data[r][c] = {
            value: datum
        };
        dirtyClean.setDirty();
    };

    var api = {
        isDirty: dirtyClean.isDirty,
        set: function(r, c, datum) {
            var data = arguments[0];
            if (!util.isArray(data)) {
                if (typeof datum === 'string') {
                    datum = datum.replace('[rR]', '').replace('[cC]', '').split(' ');
                }
                data = [{
                    row: r,
                    col: c,
                    value: datum

                }];
            }
            data.forEach(function(change) {
                internalSet(cellData, change.row, change.col, change.value);
            });
        },
        setHeader: function(r, c, datum) {
            internalSet(headerData, r, c, datum);
        },
        get: function(r, c) {
            var rowDescriptor = grid.rowModel.row(r);
            if (!rowDescriptor) {
                return {
                    formatted: ''
                };
            }
            var dataRow = cellData[rowDescriptor.dataRow];
            var datum = dataRow && dataRow[grid.colModel.col(c).dataCol];
            var value = datum && datum.value;
            var formatted = value;
            if (Array.isArray(value)) {
                formatted = (rowDescriptor.dataLayer ? ' s' + rowDescriptor.dataLayer + ' ' : '') + 'r' + value[0] + ' c' + value[1];
            }
            return {
                value: value,
                formatted: formatted || ''
            };
        },
        getCopyData: function(r, c) {
            return api.get(r, c).formatted;
        },
        getHeader: function(r, c) {
            var dataRow = headerData[grid.rowModel.get(r).dataRow];

            var datum = dataRow && dataRow[grid.colModel.get(c).dataCol];
            var value = datum && datum.value;
            return {
                value: value,
                formatted: value && 'hr' + value[0] + ' hc' + value[1] || ''
            };
        },

        toggleSort: function(c) {
            var retVal = -1;
            var compareMethod = function(val1, val2) {
                return val1 < (val2) ? retVal : -1 * retVal;
            };
            if (c === sortedCol) {
                if (ascending) {
                    retVal = 1;
                }
                ascending = !ascending;
            } else {
                sortedCol = c;
                ascending = true;
            }
            cellData.sort(function(dataRow1, dataRow2) {
                if (!dataRow1 || !dataRow1[c]) {
                    return retVal;
                }
                if (!dataRow2 || !dataRow2[c]) {
                    return retVal * -1;
                }
                return compareMethod(dataRow1[c].value, dataRow2[c].value);
            });
            dirtyClean.setDirty();
        }
    };

    return api;
};
