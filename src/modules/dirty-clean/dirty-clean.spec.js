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
        core.onDraw(function () {
            expect(dirtyClean.isDirty()).toBe(false);
        });
    });

    it('should let me set it to dirty and request draw', function () {
        var spy = spyOn(grid, 'requestDraw');
        core.resetAllDirties();
        dirtyClean.setDirty();
        core.onDraw(function () {
            expect(dirtyClean.isDirty()).toBe(true);
            expect(dirtyClean.isClean()).toBe(false);
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should let me set it to clean', function () {
        dirtyClean.setClean();
        expect(dirtyClean.isClean()).toBe(true);
        expect(dirtyClean.isDirty()).toBe(false);
    });
});