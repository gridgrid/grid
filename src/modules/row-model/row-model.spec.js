describe('row-model', function () {

    var rowModel;
    beforeEach(inject(function () {
        rowModel = require('@grid/row-model')();
    }));

    it('should be able to add and get back a row object', function () {
        rowModel.add({});
        expect(rowModel.get(0)).toBeDefined();
    });

    it('should tell you the number of rows', function () {
        rowModel.add({});
        expect(rowModel.length()).toBe(1);
    });

    it('should be able to tell you a default row height', function () {
        rowModel.add({});
        expect(rowModel.height(0)).toBeANumber();
    });

    it('should be able to tell you a specified row height', function () {
        var weirdHeight = 311;
        rowModel.add({height: weirdHeight});
        expect(rowModel.height(0)).toEqual(weirdHeight);
    });

    it('should tell you there are 0 fixed rows by default', function () {
        rowModel.add({});
        expect(rowModel.numFixed()).toEqual(0);
    });

    it('should fire changes if rows are added', function () {
        var listener = jasmine.createSpy();
        rowModel.addChangeListener(listener);
        rowModel.add({});
        expect(listener).toHaveBeenCalled();
    });
});