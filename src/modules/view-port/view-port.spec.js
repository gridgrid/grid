describe('view port', function () {

    var core = require('@grid/grid-spec-helper')();
    var viewPort;
    var grid;

    beforeEach(function () {
        grid = core.buildSimpleGrid(100, 10);
        viewPort = require('@grid/view-port')(grid);
        viewPort.sizeToContainer(core.container);
    });

    it('should accurately calculate the width and height of the container', function () {
        expect(viewPort.width).toEqual(core.CONTAINER_WIDTH);
        expect(viewPort.height).toEqual(core.CONTAINER_HEIGHT);
    });

    it('should fire an event when sized', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-viewport-change', spy);
        viewPort.sizeToContainer(core.container);
        expect(spy).toHaveBeenCalled();
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

    describe('cell coordinate conversion', function () {
        it('should do nothing when not scrolled', function () {
            expect(viewPort.toVirtualRow(5)).toEqual(5);
            expect(viewPort.toVirtualCol(6)).toEqual(6);
        });

        it('should offset result by the scroll amount', function () {
            grid.cellScrollModel.scrollTo(5, 6);
            expect(viewPort.toVirtualRow(3)).toEqual(8);
            expect(viewPort.toVirtualCol(2)).toEqual(8);
        });
    });


    it('should calculate the top left value of a viewport cell', function () {
        expect(viewPort.getRowTop(2)).toEqual(30 * 2);
        expect(viewPort.getColLeft(3)).toEqual(100 * 3);
    });

    it('should calculate the top left value of a viewport cell when shifted by one', function () {
        grid.cellScrollModel.scrollTo(0, 1);
        expect(viewPort.getRowTop(2)).toEqual(30 * 2);
        expect(viewPort.getColLeft(0)).toEqual(0);
    });

});