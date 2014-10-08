function testAbstractModel(modelCreatorFn, name, lengthName, defaultLength) {
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var grid;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        model = modelCreatorFn(grid, name, lengthName, defaultLength);
    });

    it('should be able to add and get back a ' + name + ' object', function () {
        model.add({});
        expect(model.get(0)).toBeDefined();
    });

    it('should tell you the number of ' + name + 's', function () {
        model.add({});
        model.add({});
        expect(model.length()).toBe(2);
    });

    it('should be able to tell you a default ' + name + ' ' + lengthName, function () {
        model.add({});
        expect(model[lengthName](0)).toBeANumber();
    });

    it('should be able to tell you a few specified ' + name + ' ' + lengthName + 's', function () {
        var weirdLength = 311;
        var descriptor = {};
        descriptor[lengthName] = weirdLength;
        model.add(descriptor);
        expect(model[lengthName](0)).toEqual(weirdLength);

        var weirdLength2 = 105;
        var descriptor2 = {};
        descriptor2[lengthName] = weirdLength2;
        model.add(descriptor2);
        expect(model[lengthName](1)).toBe(weirdLength2);
    });

    it('should notify listeners if ' + name + 's are added', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-' + name + '-change', spy);
        model.add({});
        expect(spy).toHaveBeenCalled();
    });

    it('should tell you there are 0 fixed ' + name + 's by default', function () {
        model.add({});
        expect(model.numFixed()).toEqual(0);
    });

    it('should let you add a fixed ' + name + '', function () {
        model.add({fixed: true});
        expect(model.numFixed()).toEqual(1);
    });

    it('should not let you add a fixed ' + name + ' after unfixed ones', function () {
        model.add({});
        expect(function () {
            model.add({fixed: true});
        }).toThrow();
    });
}


//maybe we should separate the module and the test but it's fine for now cause any requires will still only cause it to execute once
describe('abstract-row-col-model', function () {
    var abstractRowCol = require('@grid/abstract-row-col-model');
    //make sure it can satisify two sets of requirements
    testAbstractModel(abstractRowCol, 'colish', 'widthy', 100);
    testAbstractModel(abstractRowCol, 'rowesque', 'heightlike', 30);
});

module.exports = testAbstractModel;