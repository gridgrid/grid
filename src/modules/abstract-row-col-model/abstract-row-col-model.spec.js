function testAbstractModel(modelCreatorFn, name, lengthName, defaultLength) {
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var grid;

    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        model = modelCreatorFn(grid, name, lengthName, defaultLength);
    });

    it('should be able to add and get back a ' + name + ' object', function () {
        var obj = {};
        model.add(obj);
        expect(model.get(0)).toBe(obj);
    });

    it('should let me add multiple', function () {
        var ob1 = {};
        var ob2 = {};
        model.add([ob1, ob2]);
        expect(model.get(0)).toBe(ob1);
        expect(model.get(1)).toBe(ob2);
    });

    it('should be dirty on add', function () {
        helper.resetAllDirties();
        model.add({});
        expect(model).toBeDirty();
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

    it('should handle weird queries', function () {
        expect(model[lengthName](-1)).toBeNaN();
        expect(model[lengthName](10000)).toBeNaN();
        expect(model[lengthName](undefined)).toBeNaN();
    });

    it('should allow me to move a descriptor to a new index', function () {
        var orig = model.get(0);
        model.move(0, 3);
        expect(model.get(3)).toBe(orig);
    });

    it('should fire change on move', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-' + name + '-change', spy);
        model.move(0, 3);
        expect(spy).toHaveBeenCalled();
        expect(model.isDirty()).toBe(true);
    });

    describe('headers', function () {

        it('headers should be considered fixed', function () {
            var descriptor = model.create();
            descriptor.header = true;
            expect(descriptor.fixed).toBe(true);
        });

        it('should be able to add a header', function () {
            var descriptor = model.create();
            model.addHeaders(descriptor);
            expect(model.header(0)).toBe(descriptor);
        });

        it('should tell me the number of headers', function () {
            var descriptor = model.create();
            model.addHeaders(descriptor);
            expect(model.numHeaders()).toBe(1);
        });

        it('should add headers at the beginning', function () {
            var descriptor = model.create();
            model.addHeaders(descriptor);
            expect(model.get(0)).toBe(descriptor);
        });

        it('should add headers after previous headers but before the rest of the cols', function () {
            model.addHeaders(model.create());
            model.add(model.create());
            var descriptor = model.create();
            model.addHeaders(descriptor);
            expect(model.get(1)).toBe(descriptor);
        });

        it('should be included in num fixed', function () {
            model.addHeaders(model.create());
            expect(model.numFixed()).toBe(1);
        });

        it('should get me back ' + name + 's', function () {
            model.addHeaders(model.create());
            var descriptor = model.create();
            model.add(descriptor);
            expect(model[name](0)).toBe(descriptor);
        });

    });


    describe('descriptor', function () {
        describe('should satisfy', function () {
            var ctx = {};
            beforeEach(function () {
                ctx.helper = helper;
                ctx.obj = model.create();
                ctx.dirtyObjs = [model];
                ctx.props = [lengthName];
            });

            require('@grid/add-dirty-props/test-body')(ctx);
        });

        it('should fire change on ' + lengthName + ' set', function () {
            model.add(model.create());
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-' + name + '-change', spy);
            model.get(0)[lengthName] = 5;
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('selection', function () {
        beforeEach(function () {
            model.add(model.create());
        });

        it('should be able to select ' + name + 's', function () {
            model.select(0);
            expect(model.getSelected()).toEqual([0]);
        });

        it('should be idempotent', function () {
            model.select(0);
            model.select(0);
            expect(model.getSelected()).toEqual([0]);
        });

        it('should be able to clear', function () {
            model.select(0);
            model.clearSelected();
            expect(model.getSelected()).toEqual([]);
        });

        it('should be able to deselect', function () {
            model.select(0);
            model.deselect(0);
            expect(model.getSelected()).toEqual([]);
        });

        it('should be able to toggle select', function () {
            model.toggleSelect(0);
            expect(model.getSelected()).toEqual([0]);
            model.toggleSelect(0);
            expect(model.getSelected()).toEqual([]);
        });

        it('should set a selected flag on the descriptor', function () {
            model.select(0);
            expect(model.get(0).selected).toBe(true);
        });

        it('should fire an event on change', function () {
            var spy = jasmine.createSpy('selection change');
            grid.eventLoop.bind('grid-' + name + 'selection-change', spy);
            model.select(0);
            expect(spy).toHaveBeenCalled();
            spy.reset();
            model.deselect(0);
            expect(spy).toHaveBeenCalled();
            spy.reset();
            model.toggleSelect(0);
            expect(spy).toHaveBeenCalled();
            spy.reset();
            //select two so we can ensure it only gets called once
            model.add(model.create());
            model.select(1);
            spy.reset();
            model.clearSelected();
            expect(spy).toHaveBeenCalled();
            expect(spy.callCount).toBe(1);
        });
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