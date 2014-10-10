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

    it('adds style class to rendered elem', function () {
        expect(model.render()).toHaveClass('grid-selection');
    });

    it('should add itself as a decorator', function () {
        expect(grid.decorators.getAlive()).toContain(model);
    });

    it('should select a range of cells on grid drag', function () {
        var dragStart = {type: 'grid-drag-start', row: 1, col: 2};
        grid.eventLoop.fire(dragStart);
        var drag = {type: 'grid-cell-drag', row: 3, col: 4};
        grid.eventLoop.fire(drag);
        expect(model).toBeRange(1, 2, 3, 3);
        var dragEnd = {type: 'grid-drag-end', row: 2, col: 3};
        grid.eventLoop.fire(dragEnd);
    });

    it('should unbind on drag end', function () {
        var dragStart = {type: 'grid-drag-start', row: 1, col: 2};
        var unbind = helper.spyOnUnbind();
        model._onDragStart(dragStart);
        var drag = {type: 'grid-cell-drag', row: 3, col: 4};
        grid.eventLoop.fire(drag);
        expect(model).toBeRange(1, 2, 3, 3);
        var dragEnd = {type: 'grid-drag-end', row: 2, col: 3};
        grid.eventLoop.fire(dragEnd);
        expect(unbind).toHaveBeenCalled();
        expect(unbind.callCount).toBe(2);

    });
});