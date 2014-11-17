describe('cell-classes', function () {
    require('../grid-spec-helper')();
    var classes;
    beforeEach(function () {
        var grid =this.buildSimpleGrid();
        classes = grid.cellClasses;
        spyOn(grid, 'requestDraw'); //mock the draw;
    });

    describe('should create descriptors that', function () {
        var descriptor;
        var ctx = {};
        var addDirtyCtx = {};
        beforeEach(function () {
            ctx.range = descriptor = classes.create();
            ctx.parent = classes;
            addDirtyCtx.obj = descriptor;
            addDirtyCtx.dirtyObjs = [descriptor, classes];
        });

        it('should have the right defaults', function () {
            expect('class' in descriptor).toBe(true);
        });

        describe('satisfy', function () {
            addDirtyCtx.props = ['class'];
            require('../add-dirty-props/test-body')(addDirtyCtx);
        });

        describe('satisfy', function () {
            require('../position-range/test-body')(ctx);
        });

    });

    it('should allow created descriptors to be initialized', function () {
        var descriptor = classes.create(0, 1, 'name', 2, 3, 'virtual');
        expect(descriptor.top).toBe(0);
        expect(descriptor.left).toBe(1);
        expect(descriptor.height).toBe(2);
        expect(descriptor.width).toBe(3);
        expect(descriptor.class).toBe('name');
        expect(descriptor.space).toBe('virtual');
    });

    it('should allow created descriptors to be initialized without width and height', function () {
        var descriptor = classes.create(2, 3, 'name');
        expect(descriptor.top).toBe(2);
        expect(descriptor.left).toBe(3);
        expect(descriptor.height).toBe(1);
        expect(descriptor.width).toBe(1);
        expect(descriptor.class).toBe('name');
    });

    it('should be able to add descriptors and be dirty', function () {
        var descriptor = classes.create();
       this.resetAllDirties();
        classes.add(descriptor);
        expect(classes.getAll()).toContain(descriptor);
        expect(classes).toBeDirty();
    });

    it('should be able to remove descriptors and be dirty', function () {
        var descriptor = classes.create();
        classes.add(descriptor);
       this.resetAllDirties();
        classes.remove(descriptor);
        expect(classes.getAll()).not.toContain(descriptor);
        expect(classes).toBeDirty();
    });

});