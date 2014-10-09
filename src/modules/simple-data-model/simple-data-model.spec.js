describe('simple-data-model', function () {
    var dataModel;
    beforeEach(function () {
        dataModel = require('@grid/simple-data-model')();
    });

    it('should be able to set and get back data', function () {
        var datum = {};
        dataModel.set(0, 0, datum);
        expect(dataModel.get(0, 0)).toBe(datum);
    });

    it('should be able to get back a formatted string', function () {
        var value = 'formatted value';
        dataModel.set(0, 0, {value: value});
        expect(dataModel.getFormatted(0, 0)).toEqual(value);
    });

});