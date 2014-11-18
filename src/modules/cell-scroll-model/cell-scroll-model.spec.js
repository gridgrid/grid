describe('cell-scroll-model', function () {

    require('../grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    var beforeEachFunction = function (fixedR, fixedC, vary) {

        grid = this.buildSimpleGrid(numRows, numCols, false, vary, fixedR, fixedC);
        model = grid.cellScrollModel;
    };
    beforeEach(function () {
        beforeEachFunction.call(this);
    });

    it('should have a row and col value that start at 0', function () {
        expect(model.row).toEqual(0);
        expect(model.col).toEqual(0);

    });

    it('should let you "scroll" to a cell', function () {
        model.scrollTo(5, 6);
        expect(model).rowToBe(5);
        expect(model).colToBe(6);
    });

    it('should ignore NaN', function () {
        model.scrollTo(NaN, NaN);
        expect(model).rowToBe(0);
        expect(model).colToBe(0);
    });

    it('should fire event on scroll', function () {
        var spy = jasmine.createSpy('cell scroll');
        grid.eventLoop.bind('grid-cell-scroll', spy);
        model.scrollTo(5, 6, false);
        expect(spy).toHaveBeenCalled();
    });

    it('should be able to scroll without firing', function () {
        var spy = jasmine.createSpy('cell scroll');
        grid.eventLoop.bind('grid-cell-scroll', spy);
        model.scrollTo(5, 6, true);
        expect(spy).not.toHaveBeenCalled();
    });

    it('should not let you scroll to a row that doesnt exist', function () {
        model.scrollTo(1000, 5);
        expect(model.row).toEqual(numRows - 1);
        expect(model.col).toEqual(5);
        model.scrollTo(5, 1000);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(numCols - 1);
        model.scrollTo(-5, 5);
        expect(model.row).toEqual(0);
        expect(model.col).toEqual(5);
        model.scrollTo(5, -5);
        expect(model.row).toEqual(5);
        expect(model.col).toEqual(0);
    });

    it('should scroll the cells down when it receives a pixel scroll down', function () {
        grid.pixelScrollModel.scrollTo(90, 0);
        expect(model.row).toEqual(3);
    });

    it('should scroll the cells over when it receives a pixel scroll over', function () {
        grid.pixelScrollModel.scrollTo(0, 200);
        expect(model.col).toEqual(2);
    });

    it('should scroll the cells over and down when it receives a pixel scroll diagonally', function () {
        grid.pixelScrollModel.scrollTo(90, 200);
        expect(model.row).toEqual(3);
        expect(model.col).toEqual(2);
    });

    it('should request draw if the cells have shifted and should be dirty', function () {
        var request = spyOn(grid, 'requestDraw');
        grid.eventLoop.fire('grid-draw'); //first set it to false
        model.scrollTo(1, 1);
        expect(request).toHaveBeenCalled();
        expect(model).toBeDirty();
    });

    it('should not request draw if the cells havent shifted even if asked to scroll and should not be dirty', function () {
        var request = spyOn(grid, 'requestDraw');
        grid.eventLoop.fire('grid-draw'); //first set it to false
        model.scrollTo(0, 0);
        expect(request).not.toHaveBeenCalled();
        expect(model).not.toBeDirty();
    });

    describe('scroll into view', function () {
        it('should scroll a cell into view from above', function () {
            model.scrollTo(1, 1);
            model.scrollIntoView(0, 0);
            expect(model).rowToBe(0);
            expect(model).colToBe(0);
        });

        it('should scroll a cell into view from above with fixed rows and cols', function () {
            beforeEachFunction.call(this, 3, 3);
            model.scrollTo(2, 2);
            model.scrollIntoView(3, 3);
            expect(model).rowToBe(0);
            expect(model).colToBe(0);
        });

        it('should scroll a cell into view from below', function () {
            //mock viewport size
            grid.viewPort.rows = 10;
            grid.viewPort.cols = 5;
            model.scrollIntoView(95, 9);
            expect(model).rowToBe(80);
            expect(model).colToBe(2);
        });

        it('should scroll a cell into view with varied sizes', function () {
            beforeEachFunction.call(this, 3, 3, [40, 100, 400, 90]);
            model.scrollIntoView(0, 6);
            expect(model).rowToBe(0);
            expect(model).colToBe(3);
        });
    });
});