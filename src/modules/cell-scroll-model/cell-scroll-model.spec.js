describe('cell-scroll-model', function () {

    var core = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;

    beforeEach(function () {

        model = require('@grid/cell-scroll-model')(core.buildSimpleGrid(numRows, numCols));
    });

    it('should have a top and left value that start at 0', function () {
        expect(model.row).toEqual(0);
        expect(model.col).toEqual(0);

    });

    it('should let you "scroll" to a cell', function () {
        model.scrollTo(5, 6);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(6);
    });

    it('should not let you scroll to a cell that doesnt exist', function () {
        model.scrollTo(1000, 5);
        expect(model.row).toEqual(numRows - 1);
        expect(model.col).toEqual(5);
        model.scrollTo(5, 1000);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(numCols - 1);
    });

});