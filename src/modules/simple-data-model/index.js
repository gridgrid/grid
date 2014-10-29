module.exports = function (_grid) {
    var grid = _grid;

    var cellData = [];
    var sortedCol;
    var ascending;
    var dirtyClean = require('@grid/dirty-clean')(grid);
    var api = {
        isDirty: dirtyClean.isDirty,
        set: function (r, c, datum) {
            if (!cellData[r]) {
                cellData[r] = [];
            }
            cellData[r][c] = datum;
            dirtyClean.setDirty();
        },
        get: function (r, c) {
            var dataRow = cellData[grid.rowModel.get(r).dataRow];
            return dataRow && dataRow[grid.colModel.get(c).dataCol];
        },
        getFormatted: function (r, c) {
            var datum = api.get(r, c);
            return datum && datum.value && datum.value.join('-') || '';
        },
        toggleSort: function (c) {
            var retVal = -1;
            var compareMethod = function (val1, val2) {
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
            cellData.sort(function (dataRow1, dataRow2) {
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