describe('decorators', function () {
    var helper = require('@grid/grid-spec-helper')();
    var decorators;
    var grid;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        decorators = grid.decorators;
        //clear any other decorators
        decorators.remove(grid.decorators.getAlive());
        decorators.popAllDead();
        spyOn(grid, 'requestDraw'); //mock the method to prevent draw
        helper.resetAllDirties(); //set everything clean to start
    });

    describe('should create decorators', function () {
        var decorator;
        var ctx = {helper: helper};
        beforeEach(function () {
            decorator = decorators.create();
            ctx.range = decorator;
            ctx.parent = decorators;
        });

        it('with the right defaults', function () {
            expect(decorator.render).toBeAFunction();
        });

        describe('that satisify', function () {
            require('@grid/position-range/test-body')(ctx);
        });
    });


    it('should let me add a decorator and request draw', function () {
        var dec = decorators.create();
        helper.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.add(dec);
        expect(decorators).toBeDirty();
        expect(decorators.getAlive()[0]).toEqual(dec);
    });

    it('should let me remove a decorator', function () {
        var dec = decorators.create();
        helper.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.add(dec);
        helper.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.remove(dec);
        expect(decorators).toBeDirty();
        expect(decorators.getAlive()).toEqual([]);
        expect(decorators.popAllDead()).toEqual([dec]);
    });

    it('should let me remove multiple decorators', function () {

        var dec2 = decorators.create();
        var dec1 = decorators.create();
        decorators.add(dec1);
        decorators.add(dec2);
        decorators.remove([dec1, dec2]);
        expect(decorators.getAlive()).toEqual([]);
        expect(decorators.popAllDead()).toEqual([dec1, dec2]);
    });

    it('should give me alive and dead decorators and all', function () {
        var dec = decorators.create();
        decorators.add(dec);
        var dec2 = decorators.create();
        decorators.add(dec2);
        decorators.remove(dec);
        expect(decorators.getAlive()).toEqual([dec2]);
        expect(decorators.popAllDead()).toEqual([dec]);
        expect(decorators.popAllDead()).toEqual([]);

    });

});