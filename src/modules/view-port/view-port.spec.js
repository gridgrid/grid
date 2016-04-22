var mockEvent = require('../custom-event');

describe('view port', function () {

    require('../grid-spec-helper')();
    var viewPort;
    var grid;

    var beforeEachFn = function (varyHeights, varyWidths, frows, fcols, nCols) {
        grid = this.buildSimpleGrid(100, nCols || 10, varyHeights, varyWidths, frows, fcols);
        viewPort = grid.viewPort;
        viewPort.sizeToContainer(this.container);
    };
    beforeEach(function () {
        beforeEachFn.call(this);
    });

    it('should accurately calculate the width and height of the container', function () {
        expect(viewPort.width).toEqual(this.CONTAINER_WIDTH);
        expect(viewPort.height).toEqual(this.CONTAINER_HEIGHT);
    });

    it('should fire an event when sized', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-viewport-change', spy);
        viewPort.sizeToContainer(this.container);
        expect(spy).toHaveBeenCalled();
    });

    it('should calculate the max number of cells that could fit in the screen', function () {
        //basic test for default heights and widths

        var cols = Math.floor(this.CONTAINER_WIDTH / 100) + 2;
        var rows = Math.floor(this.CONTAINER_HEIGHT / 30) + 2;

        expect(viewPort.cols).toEqual(cols);
        expect(viewPort.rows).toEqual(rows);
    });

    it('should calculate the max number of cells that could fit in the screen with weird sizes', function () {
        beforeEachFn.call(this, undefined, [10, 400, 10, 300, 20, 300, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], undefined, 3, 16);
        viewPort.sizeToContainer(this.container);
        expect(viewPort.cols).toEqual(16);
    });

    it('should let you iterate the cells', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(spyFn);
        expect(spyFn).toHaveBeenCalledWith(0, 0);
        expect(spyFn).toHaveBeenCalledWith(5, 6);
        expect(spyFn).toHaveBeenCalledWith(viewPort.rows - 1, viewPort.cols - 1);
        expect(spyFn.calls.count()).toEqual(viewPort.cols * viewPort.rows);
    });

    it('should let you iterate the rows', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(undefined, spyFn);
        expect(spyFn).toHaveBeenCalledWith(0);
        expect(spyFn).toHaveBeenCalledWith(5);
        expect(spyFn).toHaveBeenCalledWith(viewPort.rows - 1);
        expect(spyFn.calls.count()).toEqual(viewPort.rows);
    });

    it('should let you iterate the rows to a max', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(undefined, spyFn, 3);
        expect(spyFn).toHaveBeenCalledWith(0);
        expect(spyFn).toHaveBeenCalledWith(2);
        expect(spyFn).not.toHaveBeenCalledWith(viewPort.rows - 1);
        expect(spyFn.calls.count()).toEqual(3);
    });

    it('should let you iterate the cols to a max', function () {
        var spyFn = jasmine.createSpy();
        viewPort.iterateCells(spyFn, undefined, undefined, 3);
        expect(spyFn).toHaveBeenCalledWith(0, 0);
        expect(spyFn).toHaveBeenCalledWith(5, 2);
        expect(spyFn).not.toHaveBeenCalledWith(viewPort.rows - 1, viewPort.cols - 1);
        expect(spyFn.calls.count()).toEqual(3 * viewPort.rows);
    });

    describe('should satisfy', function () {
        var ctx = {};
        beforeEach(function () {
            ctx.obj = viewPort;
            ctx.props = ['rows', 'cols', 'width', 'height'];
            ctx.dirtyObjs = [viewPort];
        });
        require('../add-dirty-props/test-body')(ctx);
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

    it('should clamp pixels to the viewport', function () {
        expect(viewPort.clampY(-1)).toBe(0);
        expect(viewPort.clampY(100000000)).toBe(this.CONTAINER_HEIGHT);
        expect(viewPort.clampX(-1)).toBe(0);
        expect(viewPort.clampX(100000000)).toBe(this.CONTAINER_WIDTH);
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

    it('should give me a virtual cell coordinate for a pixel value', function () {
        expect(viewPort.getVirtualRowByTop(20)).toBe(0);
        expect(viewPort.getVirtualColByLeft(20)).toBe(0);
    });

    it('should give me a virtual cell coordinate for a pixel value when scrolled', function () {
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.getVirtualRowByTop(20)).toBe(1);
        expect(viewPort.getVirtualColByLeft(20)).toBe(1);
    });

    it('should give me a virtual cell coordinate for a pixel value when scrolled and fixed', function () {
        beforeEachFn.call(this, false, false, 1, 3);
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.getVirtualRowByTop(20)).toBe(0);
        expect(viewPort.getVirtualColByLeft(20)).toBe(0);
        expect(viewPort.getVirtualRowByTop(40)).toBe(2);
        expect(viewPort.getVirtualColByLeft(350)).toBe(4);
    });


    it('should give me a  cell coordinate for a pixel value', function () {
        expect(viewPort.getRowByTop(20)).toBe(0);
        expect(viewPort.getColByLeft(20)).toBe(0);
    });

    it('should give me a cell coordinate for a pixel value when scrolled', function () {
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.getRowByTop(20)).toBe(0);
        expect(viewPort.getColByLeft(20)).toBe(0);
    });

    it('should give me a cell coordinate for a pixel value when scrolled and fixed', function () {
        beforeEachFn.call(this, false, false, 1, 3);
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.getRowByTop(20)).toBe(0);
        expect(viewPort.getColByLeft(20)).toBe(0);
        expect(viewPort.getRowByTop(40)).toBe(1);
        expect(viewPort.getColByLeft(350)).toBe(3);
    });

    it('should calculate the width and height value of a viewport cell', function () {
        beforeEachFn.call(this, [20, 30], [99, 100]);
        expect(viewPort.getRowHeight(0)).toEqual(20);
        expect(viewPort.getColWidth(0)).toEqual(99);
    });

    it('should calculate the width and height value of a viewport cell when shifted by one', function () {
        beforeEachFn.call(this, [20, 30], [99, 100]);
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.getRowHeight(0)).toEqual(30);
        expect(viewPort.getColWidth(0)).toEqual(100);
    });

    describe('fixed rows and cols', function () {

        it('should affect conversion to virtual', function () {
            beforeEachFn.call(this, false, false, 1, 2);
            grid.cellScrollModel.scrollTo(2, 1);
            expect(viewPort.toVirtualRow(0)).toBe(0);
            expect(viewPort.toVirtualCol(0)).toBe(0);

            expect(viewPort.toVirtualRow(1)).toBe(3);
            expect(viewPort.toVirtualCol(2)).toBe(3);
        });


        it('should affect height and width', function () {
            beforeEachFn.call(this, [5, 10, 15], [10, 20, 30], 1, 1);
            grid.cellScrollModel.scrollTo(1, 1);
            expect(viewPort.getColWidth(0)).toBe(10);
            expect(viewPort.getColWidth(1)).toBe(30);
            expect(viewPort.getRowHeight(0)).toBe(5);
            expect(viewPort.getRowHeight(1)).toBe(15);
        });

        it('should affect top and left', function () {
            beforeEachFn.call(this, [5, 10, 15], [10, 20, 30], 1, 1);
            grid.cellScrollModel.scrollTo(1, 1);
            expect(viewPort.getColLeft(0)).toBe(0);
            expect(viewPort.getColLeft(1)).toBe(10);
            //skip the scrolled width
            expect(viewPort.getColLeft(2)).toBe(10 + 30);

            expect(viewPort.getRowTop(0)).toBe(0);
            expect(viewPort.getRowTop(1)).toBe(5);
            //skip the scrolled width
            expect(viewPort.getRowTop(2)).toBe(5 + 15);
        });

        it('should play into max cells', function () {
            beforeEachFn.call(this, undefined, undefined, 1, 1);
            grid.rowModel.clear();
            grid.colModel.clear();
            viewPort.sizeToContainer(this.container);
            expect(viewPort.rows).toBe(0);
            expect(viewPort.cols).toBe(0);
        });
    });

    it('should let me get a real row or col from a virtual one', function () {
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.toRealRow(1)).toBe(0);
        expect(viewPort.toRealCol(1)).toBe(0);
    });

    it('should return NaN for rows and cols that arent in the view', function () {
        beforeEachFn.call(this, [5, 10, 15], [10, 20, 30], 1, 1);
        var rowScroll = 1;
        var colScroll = 1;
        grid.cellScrollModel.scrollTo(rowScroll, colScroll);
        expect(viewPort.toRealRow(1)).toBeNaN();
        expect(viewPort.toRealCol(1)).toBeNaN();
        expect(viewPort.toRealRow(viewPort.rows + rowScroll)).toBeNaN();
        expect(viewPort.toRealCol(viewPort.cols + colScroll)).toBeNaN();
    });

    describe('intersect', function () {

        it('should return the same range for ranges totally in the view', function () {
            var range = this.makeFakeRange(0, 0, 2, 3);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 2, 3);
        });

        it('should return null for ranges whos top is too high', function () {
            var range = this.makeFakeRange(10000, 0, 2, 3);
            expect(viewPort.intersect(range)).toBe(null);
        });

        it('should return null for ranges whos top plus height is below the minimum', function () {
            var range = this.makeFakeRange(0, 0, 2, 3);
            grid.cellScrollModel.scrollTo(5, 0);
            expect(viewPort.intersect(range)).toBe(null);
        });

        it('should return null for ranges whos left is too high', function () {
            var range = this.makeFakeRange(0, 10000, 2, 3);
            expect(viewPort.intersect(range)).toBe(null);
        });

        it('should return null for ranges whos left plus width is below the minimum', function () {
            var range = this.makeFakeRange(0, 0, 2, 3);
            grid.cellScrollModel.scrollTo(0, 5);
            expect(viewPort.intersect(range)).toBe(null);
        });

        it('should be able to intersect single cell ranges', function () {
            var range = this.makeFakeRange(0, 0, 1, 1);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 1, 1);
        });

        it('should return just the intersected piece for ranges that do intersect', function () {
            var range = this.makeFakeRange(5, 5, 10000, 10000);
            expect(viewPort.intersect(range)).rangeToBe(5, 5, viewPort.rows - 5, viewPort.cols - 5);
            range = this.makeFakeRange(5, 5, Infinity, Infinity);
            expect(viewPort.intersect(range)).rangeToBe(5, 5, viewPort.rows - 5, viewPort.cols - 5);
            range = this.makeFakeRange(0, 0, 5, 6);
            grid.cellScrollModel.scrollTo(3, 3);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 2, 3);
        });

        it('should be able to return ranges that cross the fixed boundary when scrolled', function () {
            beforeEachFn.call(this, false, false, 1, 2);
            var range = this.makeFakeRange(0, 0, 5, 5);
            grid.cellScrollModel.scrollTo(2, 3);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 3, 2);
        });

        it('should be able to return ranges that only intersect the fixed area', function () {
            beforeEachFn.call(this, false, false, 3, 3);
            var range = this.makeFakeRange(0, 0, 1, 1);
            grid.cellScrollModel.scrollTo(2, 3);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 1, 1);
        });

        it('should be able to intersect single cell ranges just past the fixed area', function () {
            beforeEachFn.call(this, false, false, 1, 1);
            var range = this.makeFakeRange(1, 1, 1, 1);
            expect(viewPort.intersect(range)).rangeToBe(1, 1, 1, 1);
        });

        it('should return null for ranges that should be scrolled out of view that would otherwise lie in the fixed area', function () {
            beforeEachFn.call(this, false, false, 1, 3);
            grid.cellScrollModel.scrollTo(1, 0);
            var range = this.makeFakeRange(1, 1, 1, 1);
            expect(viewPort.intersect(range)).toBe(null);
        });

        it('should be able to return ranges that intersect exactly the fixed area', function () {
            beforeEachFn.call(this, false, false, 3, 3);
            var range = this.makeFakeRange(0, 0, 3, 3);
            grid.cellScrollModel.scrollTo(2, 3);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, 3, 3);
        });

        it('should be able to return ranges that only intersect the scrollable area', function () {
            beforeEachFn.call(this, false, false, 1, 2);
            var range = this.makeFakeRange(5, 5, 10000, 10000);
            grid.cellScrollModel.scrollTo(1, 1);
            expect(viewPort.intersect(range)).rangeToBe(4, 4, viewPort.rows - 4, viewPort.cols - 4);
        });

        it('should be able to return a range for the entire virtual space', function () {
            beforeEachFn.call(this, false, false, 1, 1);
            var range = this.makeFakeRange(0, 0, Infinity, Infinity);
            expect(viewPort.intersect(range)).rangeToBe(0, 0, viewPort.rows, viewPort.cols);
        });
    });

    describe('toPx', function () {
        it('should convert a real cell range to a real pixel range', function () {
            var cellRange = this.makeFakeRange(2, 3, 5, 5);
            var range = viewPort.toPx(cellRange);
            expect(range).topToBe(2 * 30);
            expect(range).leftToBe(3 * 100);
            expect(range).heightToBe(5 * 30);
            expect(range).widthToBe(5 * 100);
        });


        it('should work across the fixed range when scrolled', function () {
            beforeEachFn.call(this, false, false, 2, 2);
            grid.cellScrollModel.scrollTo(2, 2);
            var cellRange = this.makeFakeRange(1, 1, 5, 5);
            var range = viewPort.toPx(cellRange);
            expect(range).topToBe(1 * 30);
            expect(range).leftToBe(1 * 100);
            expect(range).heightToBe(5 * 30);
            expect(range).widthToBe(5 * 100);
        });
    });

    it('should sizeToContainer on window resize', function (done) {
        this.resizeSpy.and.callThrough();
        var sizeSpy = spyOn(viewPort, 'sizeToContainer');
        window.dispatchEvent(mockEvent('resize'));
        setTimeout(function () {
            expect(sizeSpy).toHaveBeenCalled();
            done();
        }, 201);
    });

    it('should size to container on col change', function (done) {
        this.resizeSpy.and.callThrough();
        var sizeSpy = spyOn(viewPort, 'sizeToContainer');
        grid.eventLoop.fire('grid-col-change');
        setTimeout(function () {
            expect(sizeSpy).toHaveBeenCalled();
            done();
        }, 2);
    });

    it('should size to container on col change', function (done) {
        this.resizeSpy.and.callThrough();
        var sizeSpy = spyOn(viewPort, 'sizeToContainer');
        grid.eventLoop.fire('grid-row-change');
        setTimeout(function () {
            expect(sizeSpy).toHaveBeenCalled();
            done();
        }, 2);
    });

    it('should have top and left values for the client offset of the grid container', function () {
        this.container.style.marginTop = '10px';
        this.container.style.marginLeft = '5px';
        expect(viewPort.top).toBe(10);
        expect(viewPort.left).toBe(5);
    });

    it('should have convert from client to grid', function () {
        this.container.style.marginTop = '10px';
        this.container.style.marginLeft = '5px';
        expect(viewPort.toGridX(100)).toBe(95);
        expect(viewPort.toGridY(40)).toBe(30);
    });

    it('should tell me if a row or col is in view', function () {
        grid.cellScrollModel.scrollTo(1, 1);
        expect(viewPort.rowIsInView(0)).toBe(false);
        expect(viewPort.colIsInView(0)).toBe(false);

        expect(viewPort.rowIsInView(800 / 30 + 1)).toBe(false);
        expect(viewPort.colIsInView(500 / 30 + 1)).toBe(false);
    });

});
