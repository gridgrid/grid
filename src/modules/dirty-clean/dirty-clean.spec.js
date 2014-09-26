describe('dirty-clean', function () {
    var core = require('@grid/grid-spec-helper')();
    var dirtyClean;
    var grid;
    beforeEach(inject(function () {
        grid = core.buildSimpleGrid();
        core.viewBuild();
        dirtyClean = require('@grid/dirty-clean')(grid);
    }));

    it('should start dirty', function () {
        expect(dirtyClean.isDirty()).toBe(true);
    });

    it('should be clean on draw', function () {
        grid.viewLayer.draw();
        expect(dirtyClean.isDirty()).toBe(false);
    });

    it('should let me set it to dirty', function () {
        grid.viewLayer.draw(); //first set it to clean
        dirtyClean.setDirty();
        expect(dirtyClean.isDirty()).toBe(true);
    });
});