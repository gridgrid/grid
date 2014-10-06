var positionRange = require('@grid/position-range');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);

    var api = {};
    positionRange(api, dirtyClean);

    return api;
};