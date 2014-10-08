describe('dirty-clean', function () {
    var helper = require('@grid/grid-spec-helper')();
    var dirtyClean;
    var grid;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        helper.viewBuild();
        dirtyClean = require('@grid/dirty-clean')(grid);
    });

    it('should start dirty', function () {
        expect(dirtyClean).toBeDirty();
    });


    it('should be clean on draw', function () {
        grid.viewLayer.draw();
        helper.onDraw(function () {
            expect(dirtyClean).not.toBeDirty();
        });
    });

    it('should let me set it to dirty and request draw', function () {
        var spy = spyOn(grid, 'requestDraw');
        helper.resetAllDirties();
        dirtyClean.setDirty();
        expect(dirtyClean).toBeDirty();
        expect(dirtyClean).not.toBeClean();
        helper.onDraw(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should let me set it to clean', function () {
        dirtyClean.setClean();
        expect(dirtyClean).toBeClean();
        expect(dirtyClean).not.toBeDirty();
    });
});