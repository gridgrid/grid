describe('simple-grid', function () {

    var core = require('@grid/grid-spec-helper')();
    var grid;

    beforeEach(function () {
        grid = core.buildSimpleGrid();
    });

    it('should let me request a redraw', function () {
        var draw = spyOn(grid.viewLayer, 'draw');
        grid.requestRedraw();
        expect(draw).toHaveBeenCalled();
    });

    it('should not draw on request if in event loop but should draw after', function () {
        var draw = spyOnDraw();
        grid.eventLoop.addInterceptor(inLoopFn);
        grid.eventLoop.testInterface.loop();
        function inLoopFn() {
            grid.requestRedraw();
            expect(draw).not.toHaveBeenCalled();
        }

        expect(draw).toHaveBeenCalled();
    });

    function spyOnDraw() {
        return spyOn(grid.viewLayer, 'draw');
    }

});