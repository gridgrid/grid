describe('cell-scroll-model', function () {

    var core = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    beforeEach(function () {

        grid = core.buildSimpleGrid(numRows, numCols);
        model = require('@grid/cell-scroll-model')(grid);
    });

    it('should have a row and col value that start at 0', function () {
        expect(model.row).toEqual(0);
        expect(model.col).toEqual(0);

    });

    it('should let you "scroll" to a cell', function () {
        model.scrollTo(5, 6);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(6);
    });

    it('should not let you scroll to a row that doesnt exist', function () {
        model.scrollTo(1000, 5);
        expect(model.row).toEqual(numRows - 1);
        expect(model.col).toEqual(5);
        model.scrollTo(5, 1000);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(numCols - 1);
        model.scrollTo(-5, 5);
        expect(model.row).toEqual(0);
        expect(model.col).toEqual(5);
        model.scrollTo(5, -5);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(0);
    });

    it('should scroll the cells down when it receives a pixel scroll down', function () {
        grid.pixelScrollModel.scrollTo(90, 0);
        expect(model.row).toEqual(3);
    });

    it('should scroll the cells over when it receives a pixel scroll over', function () {
        grid.pixelScrollModel.scrollTo(0, 200);
        expect(model.col).toEqual(2);
    });

    it('should scroll the cells over and down when it receives a pixel scroll diagonally', function () {
        grid.pixelScrollModel.scrollTo(90, 200);
        expect(model.row).toEqual(3);
        expect(model.col).toEqual(2);
    });

    it('should request draw if the cells have shifted and should be dirty', function () {
        var request = spyOn(grid, 'requestDraw');
        grid.eventLoop.fire('grid-draw'); //first set it to false
        model.scrollTo(1, 1);
        expect(request).toHaveBeenCalled();
        expect(model).toBeDirty();
    });

    it('should not request draw if the cells havent shifted even if asked to scroll and should not be dirty', function () {
        var request = spyOn(grid, 'requestDraw');
        grid.eventLoop.fire('grid-draw'); //first set it to false
        model.scrollTo(0, 0);
        expect(request).not.toHaveBeenCalled();
        expect(model).not.toBeDirty();
    });
});