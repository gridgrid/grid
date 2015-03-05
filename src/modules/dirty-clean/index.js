module.exports = function(_grid) {
    var grid = _grid;
    var dirty = true;

    grid.eventLoop.bind('grid-draw', function() {
        api.setClean();
    });


    var api = {
        isDirty: function() {
            return dirty;
        },
        isClean: function() {
            return !dirty;
        },
        setDirty: function() {
            dirty = true;
            // when things are initalizing sometimes this doesn't exist yet
            // we have to hope that at the end of initialization the grid will call request draw itself
            if (grid.requestDraw) {
                grid.requestDraw();
            }
        },
        setClean: function() {
            dirty = false;
        }
    };
    return api;
};