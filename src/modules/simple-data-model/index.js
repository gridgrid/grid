module.exports = function (_grid) {
    var grid = _grid;

    var cellData = [];
    var api = {
        set: function (r, c, datum) {
            if (!cellData[r]) {
                cellData[r] = [];
            }
            cellData[r][c] = datum;
        },
        get: function (r, c) {
            var dataRow = cellData[r];
            return dataRow && dataRow[c];
        },
        getFormatted: function (r, c) {
            var datum = api.get(r, c);
            return datum && datum.value || '';
        }

    };

    return api;
};