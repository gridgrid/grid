describe('dirty-clean', function () {
    var core = require('@grid/grid-spec-helper')();
    var dirtyClean;
    var grid;
    beforeEach(function () {
        grid = core.buildSimpleGrid();
        core.viewBuild();
        dirtyClean = require('@grid/dirty-clean')(grid);
    });

    it('should start dirty', function () {
        expect(dirtyClean).toBeDirty();
    });


    it('should be clean on draw', function () {
        grid.viewLayer.draw();
        core.onDraw(function () {
            expect(dirtyClean).not.toBeDirty();
        });
    });

    it('should let me set it to dirty and request draw', function () {
        var spy = spyOn(grid, 'requestDraw');
        core.resetAllDirties();
        dirtyClean.setDirty();
        expect(dirtyClean).toBeDirty();
        expect(dirtyClean).not.toBeClean();
        core.onDraw(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should let me set it to clean', function () {
        dirtyClean.setClean();
        expect(dirtyClean).toBeClean();
        expect(dirtyClean).not.toBeDirty();
    });
});