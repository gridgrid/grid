var mockEvent = require('../custom-event');

describe('cell-mouse-model', function () {

    require('../grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    var beforeEachFunction = function (fixedR, fixedC, hRows, hCols) {
        grid = this.buildSimpleGrid(numRows, numCols, false, false, fixedR, fixedC, hRows, hCols);
        //set container without building to save perf
        grid.container = this.container;
        model = grid.cellMouseModel;
    };


    function createEventWithXY(name, x, y) {
        var mouseEvent = mockEvent(name);
        //somewhere in the first cell hopefully
        mouseEvent.clientX = x;
        mouseEvent.clientY = y;
        mouseEvent.which = 1;
        mouseEvent.currentTarget = grid.container;
        return mouseEvent;
    }

    var annotatedEvents = ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick'];

    function startDrag(postDownFn) {
        var mousedown = createEventWithXY('mousedown', 110, 40);
        this.container.dispatchEvent(mousedown);
        if (postDownFn) {
            postDownFn();
        }
        var mousemove = createEventWithXY('mousemove', 111, 41);
        window.dispatchEvent(mousemove);
    }

    describe('general', function () {
        beforeEach(function () {
            beforeEachFunction.call(this);
        });

        it('should annotate mouse events with the cell they are on', function () {
            grid.cellScrollModel.scrollTo(1, 1);
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 110, 40);
                model._annotateEvent(event);
                expect(event).rowToBe(2);
                expect(event).colToBe(2);
                expect(event.realRow).toBe(1);
                expect(event.realCol).toBe(1);
                expect(event.virtualRow).toBe(2);
                expect(event.virtualCol).toBe(2);
            });
        });

        it('should annotate mouse events with the cell they are on considering offset', function () {
            this.container.style.marginTop = '10px';
            this.container.style.marginLeft = '5px';
            grid.cellScrollModel.scrollTo(1, 1);
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 104, 39);
                model._annotateEvent(event);
                expect(event).rowToBe(1);
                expect(event).colToBe(1);
                expect(event.realRow).toBe(0);
                expect(event.realCol).toBe(0);
                expect(event.virtualRow).toBe(1);
                expect(event.virtualCol).toBe(1);

            });
        });

        it('should annotate mouse events with the gridX and gridY', function () {
            this.container.style.marginLeft = '5px';
            this.container.style.marginTop = '10px';
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 110, 40);
                model._annotateEvent(event);
                expect(event).gridXToBe(105);
                expect(event).gridYToBe(30);
            });
        });

        it('should fire grid-drag-start on mousedown and then move', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag-start', spy);
            startDrag.call(this, function postDownFn() {
                expect(spy).not.toHaveBeenCalled();
            });
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-drag-start');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(1);
            expect(dragEvent.clientY).toBe(40);
            expect(dragEvent.clientX).toBe(110);
        });

        it('should only fire grid-drag-start at the beginning', function () {
            var dragSpy = jasmine.createSpy('drag');
            var startSpy = jasmine.createSpy('drag start');
            grid.eventLoop.bind('grid-drag-start', startSpy);
            grid.eventLoop.bind('grid-drag', dragSpy);
            startDrag.call(this);
            expect(startSpy).toHaveBeenCalled();
            expect(dragSpy).toHaveBeenCalled();
            startSpy.calls.reset();
            dragSpy.calls.reset();
            var mousemove = createEventWithXY('mousemove', 111, 41);
            window.dispatchEvent(mousemove);
            expect(startSpy).not.toHaveBeenCalled();
            expect(dragSpy).toHaveBeenCalled();

        });

        it('should fire grid-drag event on move that doesnt cross cell boundary', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag', spy);
            startDrag.call(this);
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-drag');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(1);
            expect(dragEvent.clientY).toBe(41);
            expect(dragEvent.clientX).toBe(111);
            expect(dragEvent.gridY).toBe(41);
            expect(dragEvent.gridX).toBe(111);

        });

        it('should fire grid-cell-drag event on move only when changing cells', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-cell-drag', spy);
            startDrag.call(this);
            expect(spy).not.toHaveBeenCalled();
            var mousemove = createEventWithXY('mousemove', 210, 41);
            window.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-cell-drag');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(2);
            expect(dragEvent.clientY).toBe(41);
            expect(dragEvent.clientX).toBe(210);
            expect(dragEvent.gridY).toBe(41);
            expect(dragEvent.gridX).toBe(210);
            spy.calls.reset();
            mousemove = createEventWithXY('mousemove', 211, 41);
            window.dispatchEvent(mousemove);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should fire grid-cell-mouse-move event on move only when changing cells with no mousedown required', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-cell-mouse-move', spy);
            var mousemove = createEventWithXY('mousemove', 210, 41);
            this.container.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-cell-mouse-move');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(2);
            expect(dragEvent.clientY).toBe(41);
            expect(dragEvent.clientX).toBe(210);
            expect(dragEvent.gridY).toBe(41);
            expect(dragEvent.gridX).toBe(210);
            spy.calls.reset();
            mousemove = createEventWithXY('mousemove', 211, 41);
            this.container.dispatchEvent(mousemove);
            expect(spy).not.toHaveBeenCalled();
            spy.calls.reset();
            mousemove = createEventWithXY('mousemove', 310, 41);
            this.container.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
        });

        it('should fire grid-drag-end event on mouseup', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag-end', spy);
            startDrag.call(this);
            expect(spy).not.toHaveBeenCalled();
            var mouseup = createEventWithXY('mouseup', 111, 41);
            window.dispatchEvent(mouseup);
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-drag-end');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(1);
            expect(dragEvent.clientY).toBe(41);
            expect(dragEvent.clientX).toBe(111);
            expect(dragEvent.gridY).toBe(41);
            expect(dragEvent.gridX).toBe(111);
        });

        it('should fire drag end if gets a mousemove without the mouse button down', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag-end', spy);
            startDrag.call(this);
            var mousemove = createEventWithXY('mousemove', 111, 41);
            mousemove.which = 0;
            window.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('with headers', function () {
        beforeEach(function () {
            beforeEachFunction.call(this, 0, 0, 1, 1);
        });

        it('should offset the event annotations for the headers', function () {
            grid.cellScrollModel.scrollTo(2, 2);
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 110, 40);
                model._annotateEvent(event);
                expect(event).rowToBe(2);
                expect(event).colToBe(2);
                expect(event.realRow).toBe(1);
                expect(event.realCol).toBe(1);
                expect(event.virtualRow).toBe(3);
                expect(event.virtualCol).toBe(3);
            });
        });

        it('should have negative values for row col event annotation if in headers', function () {
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 95, 25);
                model._annotateEvent(event);
                expect(event).rowToBe(-1);
                expect(event).colToBe(-1);
                expect(event.realRow).toBe(0);
                expect(event.realCol).toBe(0);
                expect(event.virtualRow).toBe(0);
                expect(event.virtualCol).toBe(0);
            });
        });

        describe('scroll on drag', function () {

            function testScrollDrag(x, y, rowDiff, colDiff, done) {
                var mousedown = createEventWithXY('mousedown', 110, 40);
                this.container.dispatchEvent(mousedown);
                this.grid.eventLoop.bind('grid-drag-start', function (e) {
                    e.enableAutoScroll && e.enableAutoScroll();
                });
                var scroll = spyOn(this.grid.cellScrollModel, 'scrollTo').and.callThrough();
                window.dispatchEvent(createEventWithXY('mousemove', 111, 41));
                expect(scroll).not.toHaveBeenCalled();
                var prevCol = grid.cellScrollModel.col;
                var prevRow = grid.cellScrollModel.row;
                window.dispatchEvent(createEventWithXY('mousemove', x, y));
                setTimeout(function () {
                    expect(scroll).toHaveBeenCalledWith(prevRow + rowDiff, prevCol + colDiff);
                    scroll.calls.reset();
                    setTimeout(function () {
                        expect(scroll).toHaveBeenCalledWith(prevRow + rowDiff * 2, prevCol + colDiff * 2);
                        scroll.calls.reset();
                        var mouseup = createEventWithXY('mouseup', 111, 41);
                        window.dispatchEvent(mouseup);
                        setTimeout(function () {
                            expect(scroll).not.toHaveBeenCalled();
                            done();
                        }, 101);
                    }, 101);

                }, 101);
            }


            it('should scroll right if outside the window to the right', function (done) {
                document.body.removeChild(this.container)
                testScrollDrag.call(this, window.innerWidth + 1, 121, 0, 1, done);
            });

            it('should scroll done if outside the window to the bottom', function (done) {
                document.body.removeChild(this.container)
                testScrollDrag.call(this, 121, window.innerHeight + 1, 1, 0, done);
            });

            it('should scroll right if outside the bounding rect to the right', function (done) {
                testScrollDrag.call(this, grid.container.getBoundingClientRect().right + 1, 121, 0, 1, done);
            });

            it('should scroll done if outside the bounding rect to the bottom', function (done) {
                testScrollDrag.call(this, 121, grid.container.getBoundingClientRect().bottom + 1, 1, 0, done);
            });

            it('should scroll left if left of the unfixed range', function (done) {
                grid.cellScrollModel.scrollTo(2, 2);
                testScrollDrag.call(this, 1, 121, 0, -1, done);
            });

            it('should scroll right if outside the window to the right', function (done) {
                grid.cellScrollModel.scrollTo(2, 2);
                testScrollDrag.call(this, 121, 1, -1, 0, done);
            });
        });
    });

});
