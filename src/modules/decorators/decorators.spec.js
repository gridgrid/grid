describe('decorators', function () {
    var $ = require('jquery');
    require('../grid-spec-helper')();
    var decorators;
    var grid;
    var ctx = {};
    beforeEach(function () {
        grid = this.buildSimpleGrid();
        decorators = grid.decorators;
        //clear any other decorators
        decorators.remove(grid.decorators.getAlive());
        decorators.popAllDead();
        spyOn(grid, 'requestDraw'); //mock the method to prevent draw
        this.resetAllDirties(); //set everything clean to start
    });

    describe('should satisfy', function () {

        beforeEach(function () {
            ctx.decorator = decorators.create();
        });

        it('single decorator default render an element that fills the bounding box', function () {
            var div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.top = '5px';
            div.style.left = '6px';
            div.style.width = '25px';
            div.style.height = '35px';

            var decoratorElem = ctx.decorator.render();
            div.appendChild(decoratorElem);
            document.body.appendChild(div);
            expect($(decoratorElem).offset()).toEqual({
                top: 5,
                left: 6
            });

            expect($(decoratorElem).width()).toBe(25);
            expect($(decoratorElem).height()).toBe(35);
        });

        it('should call a postrender if available on render', function () {
            var postRender = jasmine.createSpy('post render');
            ctx.decorator.postRender = postRender;
            ctx.decorator.render();
            expect(postRender).toHaveBeenCalled();

        });

        require('../decorators/decorator-test-body')(ctx);
    });

    it('should let me create a decorator with values', function () {
        var d = decorators.create(2, 3, 4, 5, 'px', 'view');
        expect(d).topToBe(2);
        expect(d).leftToBe(3);
        expect(d).heightToBe(4);
        expect(d).widthToBe(5);
        expect(d).unitsToBe('px');
        expect(d).spaceToBe('view');
    });


    it('should let me add a decorator and request draw', function () {
        var dec = decorators.create();
        this.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.add(dec);
        expect(decorators).toBeDirty();
        expect(decorators.getAlive()[0]).toEqual(dec);
    });

    it('should let me add multiple decorators', function () {
        var dec = decorators.create();
        var dec2 = decorators.create();
        decorators.add([dec, dec2]);
        expect(decorators.getAlive()[0]).toEqual(dec);
        expect(decorators.getAlive()[1]).toEqual(dec2);
    });

    it('should let me remove a decorator', function () {
        var dec = decorators.create();
        this.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.add(dec);
        this.resetAllDirties();
        expect(decorators).not.toBeDirty();
        decorators.remove(dec);
        expect(decorators).toBeDirty();
        expect(decorators.getAlive()).toEqual([]);
        expect(decorators.popAllDead()).toEqual([dec]);
    });

    it('should do nothing if removing an already removed decorator', function () {
        decorators.add(decorators.create());
        var removed = decorators.create();
        decorators.add(removed);
        decorators.remove(removed);
        decorators.remove(removed);
        expect(decorators.getAlive().length).toBe(1);
        expect(decorators.popAllDead().length).toBe(1);
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

    it('should give me alive and pop all dead decorators', function () {
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