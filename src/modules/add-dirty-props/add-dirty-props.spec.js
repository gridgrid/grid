(function () {
    var makeDirtyClean = require('@grid/dirty-clean');
    var helper = require('@grid/grid-spec-helper')();

    var ctx = {helper: helper, props: ['random', 'props', 'are', 'func']};
    beforeEach(function () {
        var grid = helper.buildSimpleGrid();
        var parentDirtyClean = makeDirtyClean(grid);
        var parent = {isDirty: parentDirtyClean.isDirty};
        var dirtyClean = makeDirtyClean(grid);
        ctx.obj = require('@grid/add-dirty-props')({}, ctx.props, [dirtyClean, parentDirtyClean]);
        ctx.obj.isDirty = dirtyClean.isDirty;
        ctx.parent = parent;
    });

    require('@grid/add-dirty-props/test-body')(ctx);
})();