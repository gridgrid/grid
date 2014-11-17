(function () {
    describe('position range core', function () {

        var dirtyClean = require('../dirty-clean');
        require('../grid-spec-helper')();

        var ctx = {};
        beforeEach(function () {
            var grid = this.buildSimpleGrid();
            var parentDirtyClean = dirtyClean(grid);
            var parent = {isDirty: parentDirtyClean.isDirty};
            ctx.range = require('../position-range')(undefined, dirtyClean(grid), parentDirtyClean);
            ctx.parent = parent;
        });

        require('../position-range/test-body')(ctx);
        describe('position-range', function () {
            it('should default to virtual cell', function () {
                expect(ctx.range).unitsToBe('cell');
                expect(ctx.range).spaceToBe('data');
            });
        });
    });

})();