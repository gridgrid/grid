(function () {
    describe('add dirty props root', function () {


        var makeDirtyClean = require('@grid/dirty-clean');
        var helper = require('@grid/grid-spec-helper')();
        var spy;
        var ctx = {props: ['random', 'props', 'are', 'fun']};
        beforeEach(function () {
            var grid = helper.buildSimpleGrid();
            var parentDirtyClean = makeDirtyClean(grid);
            var parent = {isDirty: parentDirtyClean.isDirty};
            var dirtyClean = makeDirtyClean(grid);
            spy = jasmine.createSpy('prop function');
            ctx.props.push({name: 'objProp', onDirty: spy});
            ctx.obj = require('@grid/add-dirty-props')({}, ctx.props, [dirtyClean, parentDirtyClean]);
            ctx.obj.isDirty = dirtyClean.isDirty;
            ctx.dirtyObjs = [ctx.obj, parent];
            ctx.helper = helper;
        });

        require('@grid/add-dirty-props/test-body')(ctx);

        afterEach(function () {
            expect(spy).toHaveBeenCalled();
            expect(spy.callCount).toBe(1);
        });
    });
})();