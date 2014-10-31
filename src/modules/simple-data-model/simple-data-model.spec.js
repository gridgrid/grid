describe('simple-data-model', function () {
    var helper = require('@grid/grid-spec-helper')();
    var grid;
    var dataModel;
    beforeEach(function () {
        grid = helper.buildSimpleGrid(undefined, undefined, false, false, 1, 1, 1, 1);
        dataModel = grid.dataModel;
    });

    it('should be able to get back data', function () {
        expect(dataModel.get(0, 0).value).toBeDefined();
        expect(dataModel.get(0, 0).formatted).toBeAString();
    });

    it('should be able to get back header data', function () {
        expect(dataModel.getHeader(0, 0).value).toBeDefined();
        expect(dataModel.getHeader(0, 0).formatted).toBeAString();
    });

    it('should be able to sort by a col', function () {
        var last = dataModel.get(99, 0).formatted;
        dataModel.toggleSort(0);
        dataModel.toggleSort(0);
        expect(dataModel.get(0, 0).formatted).toBe(last);
    });

});