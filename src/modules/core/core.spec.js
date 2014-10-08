describe('grid-core', function () {
    var grid;
    beforeEach(function () {
        grid = require('@grid/core')();
    });

    it('should have the right models', function () {
        expect(grid).toHaveField('eventLoop');
        expect(grid).toHaveField('decorators');
        expect(grid).toHaveField('cellClasses');
        expect(grid).toHaveField('rowModel');
        expect(grid).toHaveField('colModel');
        expect(grid).toHaveField('dataModel');
        expect(grid).toHaveField('virtualPixelCellModel');
        expect(grid).toHaveField('cellScrollModel');
        expect(grid).toHaveField('navigationModel');
        expect(grid).toHaveField('viewLayer');
        expect(grid).toHaveField('pixelScrollModel');
    });

    it('should have a main build function', function () {
        var viewBuild = spyOn(grid.viewLayer, 'build');
        var loopBuild = spyOn(grid.eventLoop, 'setContainer');
        grid.build(document.createElement('div'));
        expect(viewBuild).toHaveBeenCalled();
        expect(loopBuild).toHaveBeenCalled();
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
});