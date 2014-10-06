(function () {
    var dirtyClean = require('@grid/dirty-clean');
    var core = require('@grid/grid-spec-helper')();

    var ctx = {core: core};
    beforeEach(function () {
        var grid = core.buildSimpleGrid();
        var parentDirtyClean = dirtyClean(grid);
        var parent = {isDirty: parentDirtyClean.isDirty};
        ctx.range = require('@grid/position-range')(undefined, dirtyClean(grid), parentDirtyClean);
        ctx.parent = parent;
    });

    require('@grid/position-range/test-body')(ctx);
})();