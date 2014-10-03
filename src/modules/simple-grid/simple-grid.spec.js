describe('simple-grid', function () {

    var core = require('@grid/grid-spec-helper')();
    var grid;

    beforeEach(function () {
        grid = core.buildSimpleGrid();
    });


    function spyOnDraw() {
        return spyOn(grid.viewLayer, 'draw');
    }

    it('should let me request a redraw', function () {
        var draw = spyOn(grid.viewLayer, 'draw');
        grid.requestDraw();
        expect(draw).toHaveBeenCalled();
    });

    it('should not draw on request if in event loop but should draw after', function () {
        var draw = spyOnDraw();
        grid.eventLoop.addInterceptor(inLoopFn);
        grid.eventLoop.fire({});
        function inLoopFn() {
            grid.requestDraw();
            expect(draw).not.toHaveBeenCalled();
        }

        expect(draw).toHaveBeenCalled();
    });

    it('should let me vary the widths ', function () {
        grid = core.buildSimpleGrid(100, 10, undefined, [99, 100, 101]);
        expect(grid.colModel.width(0)).toBe(99);
        expect(grid.colModel.width(1)).toBe(100);
        expect(grid.colModel.width(2)).toBe(101);
    });

    it('should let me vary the heights ', function () {
        grid = core.buildSimpleGrid(100, 10, [20, 30, 40], [99, 100, 101]);
        expect(grid.rowModel.height(0)).toBe(20);
        expect(grid.rowModel.height(1)).toBe(30);
        expect(grid.rowModel.height(2)).toBe(40);
    });

    it('should let me specify fixed rows and cols', function () {
        grid = core.buildSimpleGrid(100, 10, false, false, 1, 5);
        expect(grid.colModel.numFixed()).toBe(5);
        expect(grid.rowModel.numFixed()).toBe(1);
    });
});