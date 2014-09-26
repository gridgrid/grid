module.exports = function (_grid) {
    var grid = _grid;
    var dirty = true;

    grid.eventLoop.bind('grid-draw', function () {
        api.setClean();
    });


    var api = {
        isDirty: function () {
            return dirty;
        },
        isClean: function () {
            return !dirty;
        },
        setDirty: function () {
            dirty = true;
            grid.requestDraw();
        },
        setClean: function () {
            dirty = false;
        }
    };
    return api;
};