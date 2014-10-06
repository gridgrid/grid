var dirtyClean = require('@grid/dirty-clean');
var core = require('@grid/grid-spec-helper')();
require('@grid/position-range/test-body')(function () {
    var grid = core.buildSimpleGrid();
    var parentDirtyClean = dirtyClean(grid);
    var parent = {isDirty: parentDirtyClean.isDirty};
    return {
        core: core,
        range: require('@grid/position-range')(undefined, dirtyClean(grid), parentDirtyClean),
        parent: parent
    };
});