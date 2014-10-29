describe('simple-data-model', function () {
    var helper = require('@grid/grid-spec-helper')();
    var grid;
    var dataModel;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        dataModel = grid.dataModel;
    });

    it('should be able to get back data', function () {
        expect(dataModel.get(0, 0).value).toBeDefined();
    });

    it('should be able to get back a formatted string', function () {
        expect(dataModel.getFormatted(0, 0)).toBeAString();
    });

    it('should be able to sort by a col', function () {
        var last = dataModel.getFormatted(99, 0);
        dataModel.toggleSort(0);
        dataModel.toggleSort(0);
        expect(dataModel.getFormatted(0, 0)).toBe(last);
    });

});