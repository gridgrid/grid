describe('dirty-clean', function () {
    require('../grid-spec-helper')();
    var dirtyClean;
    var grid;
    beforeEach(function () {
        grid = this.buildSimpleGrid();
        this.viewBuild();
        dirtyClean = require('../dirty-clean')(grid);
    });

    it('should start dirty', function () {
        expect(dirtyClean).toBeDirty();
    });


    it('should be clean on draw', function (done) {
        grid.viewLayer.draw();
        this.onDraw(function () {
            expect(dirtyClean).not.toBeDirty();
            done();
        });
    });

    it('should let me set it to dirty and request draw', function (done) {
        var spy = spyOn(grid, 'requestDraw');
        this.resetAllDirties();
        dirtyClean.setDirty();
        expect(dirtyClean).toBeDirty();
        expect(dirtyClean).not.toBeClean();
        this.onDraw(function () {
            expect(spy).toHaveBeenCalled();
            done();
        });
    });

    it('should let me set it to clean', function () {
        dirtyClean.setClean();
        expect(dirtyClean).toBeClean();
        expect(dirtyClean).not.toBeDirty();
    });
});