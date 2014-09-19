describe('virtual-pixel-cell-model', function () {

    var core = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    beforeEach(function () {
        grid = core.buildSimpleGrid(numRows, numCols);
        model = grid.virtualPixelCellModel;

    });

    it('should tell me the data row of a virtual top location', function () {
        expect(model.getRow(91)).toBe(3);
    });

    it('should tell the the data col of a virtual left location', function () {
        expect(model.getCol(201)).toBe(2);
    });

    it('should return NaN if the px value is above or below the possible values', function () {
        expect(model.getCol(-1)).toBeNaN();
        expect(model.getCol(1000000000)).toBeNaN();
        expect(model.getRow(-1)).toBeNaN();
        expect(model.getRow(1000000000)).toBeNaN();
    });
});