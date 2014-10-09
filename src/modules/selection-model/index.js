module.exports = function (_grid) {
    var grid = _grid;

    var model = grid.decorators.create();

    grid.decorators.add(model);

    return model;
};