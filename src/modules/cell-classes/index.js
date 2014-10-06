var positionRange = require('@grid/position-range');
var makeDirtyClean = require('@grid/dirty-clean');
var addDirtyProps = require('@grid/add-dirty-props');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);

    var api = {
        create: function () {
            var thisDirtyClean = makeDirtyClean(grid);
            var descriptor = {};
            //mixins
            positionRange(descriptor, thisDirtyClean, dirtyClean);
            addDirtyProps(descriptor, ['class'], [thisDirtyClean, dirtyClean]);
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };


    return api;
};