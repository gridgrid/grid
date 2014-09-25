describe('col-model', function () {
    var colModel;
    beforeEach(inject(function () {
        colModel = require('@grid/col-model')();
    }));

    it('should be able to add and get back a col object', function () {
        colModel.add({});
        expect(colModel.get(0)).toBeDefined();
    });

    it('should tell you the number of cols', function () {
        colModel.add({});
        expect(colModel.length()).toBe(1);
    });

    it('should be able to tell you a default col width', function () {
        colModel.add({});
        expect(colModel.width(0)).toBeANumber();
    });

    it('should be able to tell you a specified col width', function () {
        var weirdWidth = 311;
        colModel.add({width: weirdWidth});
        expect(colModel.width(0)).toEqual(weirdWidth);
    });

    it('should tell you there are 0 fixed cols by default', function () {
        colModel.add({});
        expect(colModel.numFixed()).toEqual(0);
    });

    it('should notify listeners if cols are added', function () {
        var spy = jasmine.createSpy();
        colModel.addChangeListener(spy);
        colModel.add({});
        expect(spy).toHaveBeenCalled();
    });
});