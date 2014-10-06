var core = require('@grid/grid-spec-helper')();

describe('cell-classes', function () {
    var classes;
    beforeEach(function () {
        var grid = core.buildSimpleGrid();
        classes = grid.cellClasses;
    });

    describe('should create descriptors that', function () {
        var descriptor;
        var ctx = {core: core};
        var addDirtyCtx = {core: core};
        beforeEach(function () {
            ctx.range = descriptor = classes.create();
            ctx.parent = classes;
            addDirtyCtx.obj = descriptor;
            addDirtyCtx.parent = classes;
        });

        it('should have the right defaults', function () {
            expect('class' in descriptor).toBe(true);
        });

        describe('satisfy', function () {
            addDirtyCtx.props = ['class'];
            require('@grid/add-dirty-props/test-body')(addDirtyCtx);
        });

        describe('satisfy', function () {
            require('@grid/position-range/test-body')(ctx);
        });

    });

});