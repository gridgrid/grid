module.exports = function (_grid) {
    var grid = _grid;

    var api = require('../abstract-row-col-model')(grid, 'col', 'width', 100);

    return api;
};