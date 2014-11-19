(function () {
    describe('add dirty props root', function () {


        var makeDirtyClean = require('../dirty-clean');
        require('../grid-spec-helper')();

        var ctx = {props: ['random', 'props', 'are', 'fun']};
        beforeEach(function () {
            var grid = this.buildSimpleGrid();
            var parentDirtyClean = makeDirtyClean(grid);
            var parent = {isDirty: parentDirtyClean.isDirty};
            var dirtyClean = makeDirtyClean(grid);
            var self = this;
            var prop = {name: 'objProp', onDirty: function () {
                self.valueChangedBeforeOnDirty = !!ctx.obj.objProp;
            }};
            this.spy = spyOn(prop, 'onDirty').and.callThrough();
            ctx.props.push(prop);
            ctx.obj = require('../add-dirty-props')({}, ctx.props, [dirtyClean, parentDirtyClean]);
            ctx.obj.isDirty = dirtyClean.isDirty;
            ctx.dirtyObjs = [ctx.obj, parent];
        });

        require('../add-dirty-props/test-body')(ctx);

        afterEach(function () {
            expect(this.spy).toHaveBeenCalled();
            expect(this.spy.calls.count()).toBe(1);
            expect(this.valueChangedBeforeOnDirty).toBe(true);
        });
    });
})();