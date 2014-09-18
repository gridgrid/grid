describe('view port', function () {

    var core = require('@grid/grid-spec-helper')();
    var viewPort;

    beforeEach(function () {
        var grid = core.buildSimpleGrid(100, 10);
        viewPort = require('@grid/view-port')(grid);
        viewPort.sizeToContainer(core.container);
    });

    it('should accurately calculate the width and height of the container', function () {
        expect(viewPort.width).toEqual(core.CONTAINER_WIDTH);
        expect(viewPort.height).toEqual(core.CONTAINER_HEIGHT);
    });

    it('should calculate the max number of cells that could fit in the screen', function () {
        //basic test for default heights and widths

        var minCols = Math.floor(core.CONTAINER_WIDTH / 100) + 1;
        var minRows = Math.floor(core.CONTAINER_HEIGHT / 30) + 1;

        expect(viewPort.minCols).toEqual(minCols);
        expect(viewPort.minRows).toEqual(minRows);
    });

    it('should let you iterate the cells', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(spyFn);
        expect(spyFn).toHaveBeenCalledWith(0, 0);
        expect(spyFn).toHaveBeenCalledWith(5, 6);
        expect(spyFn).toHaveBeenCalledWith(viewPort.minRows - 1, viewPort.minCols - 1);
        expect(spyFn.callCount).toEqual(viewPort.minCols * viewPort.minRows);
    });

    it('should let you iterate the rows', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(undefined, spyFn);
        expect(spyFn).toHaveBeenCalledWith(0);
        expect(spyFn).toHaveBeenCalledWith(5);
        expect(spyFn).toHaveBeenCalledWith(viewPort.minRows - 1);
        expect(spyFn.callCount).toEqual(viewPort.minRows);
    });
});