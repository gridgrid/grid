module.exports = function (_grid) {
    var grid = _grid;

    var api = require('@grid/abstract-row-col-model').create(grid, 'col', 'width', 100);

    return api;
};