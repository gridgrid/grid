(function () {
    describe('position range core', function () {

        var dirtyClean = require('@grid/dirty-clean');
        var helper = require('@grid/grid-spec-helper')();

        var ctx = {helper: helper};
        beforeEach(function () {
            var grid = helper.buildSimpleGrid();
            var parentDirtyClean = dirtyClean(grid);
            var parent = {isDirty: parentDirtyClean.isDirty};
            ctx.range = require('@grid/position-range')(undefined, dirtyClean(grid), parentDirtyClean);
            ctx.parent = parent;
        });

        require('@grid/position-range/test-body')(ctx);
        describe('position-range', function () {
            it('should default to virtual cell', function () {
                expect(ctx.range).unitsToBe('cell');
                expect(ctx.range).spaceToBe('data');
            });
        });
    });

})();