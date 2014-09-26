module.exports = function (_grid) {
    var grid = _grid;
    var dirty = true;

    grid.viewLayer.addDrawListener(function () {
        dirty = false;
    });

    var api = {
        isDirty: function () {
            return dirty;
        },
        setDirty: function () {
            dirty = true;
        }
    };
    return api;
};