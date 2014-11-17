module.exports = function (_grid) {
    var grid = _grid;

    var api = require('../abstract-row-col-model')(grid, 'row', 'height', 30);

    return api;
};