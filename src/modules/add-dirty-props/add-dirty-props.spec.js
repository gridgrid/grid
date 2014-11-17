(function () {
    describe('add dirty props root', function () {


        var makeDirtyClean = require('../dirty-clean');
        require('../grid-spec-helper')();
        var spy;
        var ctx = {props: ['random', 'props', 'are', 'fun']};
        beforeEach(function () {
            var grid = this.buildSimpleGrid();
            var parentDirtyClean = makeDirtyClean(grid);
            var parent = {isDirty: parentDirtyClean.isDirty};
            var dirtyClean = makeDirtyClean(grid);
            spy = jasmine.createSpy('prop function');
            ctx.props.push({name: 'objProp', onDirty: spy});
            ctx.obj = require('../add-dirty-props')({}, ctx.props, [dirtyClean, parentDirtyClean]);
            ctx.obj.isDirty = dirtyClean.isDirty;
            ctx.dirtyObjs = [ctx.obj, parent];
        });

        require('../add-dirty-props/test-body')(ctx);

        afterEach(function () {
            expect(spy).toHaveBeenCalled();
            expect(spy.calls.count()).toBe(1);
        });
    });
})();