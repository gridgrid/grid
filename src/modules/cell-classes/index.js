var positionRange = require('@grid/position-range');
var makeDirtyClean = require('@grid/dirty-clean');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);

    var api = {
        create: function () {
            var thisDirtyClean = makeDirtyClean(grid);
            var descriptor = positionRange(undefined, thisDirtyClean, dirtyClean);
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };


    return api;
};