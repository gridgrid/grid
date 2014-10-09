describe('selection-model', function () {
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var grid;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        model = grid.selectionModel;
    });

    describe('should satisfy:', function () {
        var ctx = {helper: helper};
        beforeEach(function () {
            ctx.decorator = model;
        });
        require('@grid/decorators/decorator-test-body')(ctx);
    });

    it('should add itself as a decorator', function () {
        expect(grid.decorators.getAlive()).toContain(model);
    });

    it('should select a range of cells on grid drag', function () {
        var dragStart = {type: 'grid-drag-start', row: 1, col: 2};
    });
});