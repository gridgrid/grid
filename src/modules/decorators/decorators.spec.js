describe('decorators', function () {
    var core = require('@grid/grid-spec-helper')();
    var decorators;
    var grid;
    beforeEach(inject(function () {
        grid = core.buildSimpleGrid();
        decorators = grid.decorators;
        grid.eventLoop.fire('grid-draw'); //set everything clean to start
    }));

    it('should let me add a decorator and request draw', function () {
        var spy = spyOn(grid, 'requestDraw'); //mock the method to prevent draw
        var dec = {};
        expect(decorators.isDirty()).toBe(false);
        decorators.add(dec);
        expect(decorators.isDirty()).toBe(true);
        expect(decorators.getAlive()[0]).toEqual(dec);
    });

    it('should let me remove a decorator', function () {
        var spy = spyOn(grid, 'requestDraw'); //mock the method to prevent draw
        var dec = {};
        expect(decorators.isDirty()).toBe(false);
        decorators.add(dec);
        grid.eventLoop.fire('grid-draw');
        expect(decorators.isDirty()).toBe(false);
        decorators.remove(dec);
        expect(decorators.isDirty()).toBe(true);
        expect(decorators.getAlive()).toEqual([]);
        expect(decorators.popAllDead()).toEqual([dec]);
    });

    it('should let me remove multiple decorators', function () {
        var spy = spyOn(grid, 'requestDraw'); //mock the method to prevent draw

        var dec2 = {};
        var dec1 = {};
        decorators.add(dec1);
        decorators.add(dec2);
        decorators.remove([dec1, dec2]);
        expect(decorators.getAlive()).toEqual([]);
        expect(decorators.popAllDead()).toEqual([dec1, dec2]);
    });

    it('should give me alive and dead decorators and all', function () {
        var spy = spyOn(grid, 'requestDraw'); //mock the method to prevent draw
        var dec = {};
        decorators.add(dec);
        var dec2 = {};
        decorators.add(dec2);
        decorators.remove(dec);
        expect(decorators.getAlive()).toEqual([dec2]);
        expect(decorators.popAllDead()).toEqual([dec]);
    });

});