var mockEvent = require('@grid/custom-event');

describe('cell-mouse-model', function () {

    var helper = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    var beforeEachFunction = function (fixedR, fixedC, hRows, hCols) {
        grid = helper.buildSimpleGrid(numRows, numCols, false, false, fixedR, fixedC, hRows, hCols);
        model = grid.cellMouseModel;
    };


    function createEventWithXY(name, x, y) {
        var mouseEvent = mockEvent(name);
        //somewhere in the first cell hopefully
        mouseEvent.clientX = x;
        mouseEvent.clientY = y;
        mouseEvent.which = 1;
        return mouseEvent;
    }

    var annotatedEvents = ['mousedown', 'mousemove', 'mouseup', 'click'];

    describe('general', function () {
        beforeEach(function () {
            beforeEachFunction();
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
            helper.container.style.marginTop = '10px';
            helper.container.style.marginLeft = '5px';
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
            helper.container.style.marginLeft = '5px';
            helper.container.style.marginTop = '10px';
            annotatedEvents.forEach(function (type) {
                var event = createEventWithXY(type, 110, 40);
                model._annotateEvent(event);
                expect(event).gridXToBe(105);
                expect(event).gridYToBe(30);
            });
        });


        it('should note when a click has not been dragged', function () {
            var click = createEventWithXY('click', 110, 40);
            grid.eventLoop.fire(click);
            expect(click.wasDragged).toBe(false);
        });

        it('should note when a click has been dragged', function () {
            startDrag();
            window.dispatchEvent(createEventWithXY('mouseup', 111, 41));
            var click = createEventWithXY('click', 110, 40);
            grid.eventLoop.fire(click);
            expect(click.wasDragged).toBe(true);
        });

        it('should fire grid-drag-start on mousedown and then move', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag-start', spy);
            startDrag(function postDownFn() {
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
            startDrag();
            expect(startSpy).toHaveBeenCalled();
            expect(dragSpy).toHaveBeenCalled();
            startSpy.calls.reset();
            dragSpy.calls.reset();
            var mousemove = createEventWithXY('mousemove', 111, 41);
            window.dispatchEvent(mousemove);
            expect(startSpy).not.toHaveBeenCalled();
            expect(dragSpy).toHaveBeenCalled();

        });

        function startDrag(postDownFn) {
            var mousedown = createEventWithXY('mousedown', 110, 40);
            helper.container.dispatchEvent(mousedown);
            if (postDownFn) {
                postDownFn();
            }
            var mousemove = createEventWithXY('mousemove', 111, 41);
            window.dispatchEvent(mousemove);
        }

        it('should fire grid-drag event on move that doesnt cross cell boundary', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag', spy);
            startDrag();
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
            startDrag();
            expect(spy).not.toHaveBeenCalled();
            var mousemove = createEventWithXY('mousemove', 201, 41);
            window.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
            var dragEvent = spy.calls.argsFor(0)[0];
            expect(dragEvent.type).toBe('grid-cell-drag');
            expect(dragEvent).rowToBe(1);
            expect(dragEvent).colToBe(2);
            expect(dragEvent.clientY).toBe(41);
            expect(dragEvent.clientX).toBe(201);
            expect(dragEvent.gridY).toBe(41);
            expect(dragEvent.gridX).toBe(201);
            spy.calls.reset();
            mousemove = createEventWithXY('mousemove', 202, 41);
            window.dispatchEvent(mousemove);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should fire grid-drag-end event on mouseup', function () {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-drag-end', spy);
            startDrag();
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
            startDrag();
            var mousemove = createEventWithXY('mousemove', 111, 41);
            mousemove.which = 0;
            window.dispatchEvent(mousemove);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('with headers', function () {
        beforeEach(function () {
            beforeEachFunction(0, 0, 1, 1);
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
    });

});