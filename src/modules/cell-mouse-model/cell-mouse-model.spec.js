var mockEvent = require('@grid/custom-event');

describe('cell-mouse-model', function () {

    var helper = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    var beforeEachFunction = function (fixedR, fixedC) {
        grid = helper.buildSimpleGrid(numRows, numCols, false, false, fixedR, fixedC);
        model = grid.cellMouseModel;
    };
    beforeEach(beforeEachFunction);

    function createEventWithXY(name, x, y) {
        var mousedown = mockEvent(name);
        //somewhere in the first cell hopefully
        mousedown.clientX = x;
        mousedown.clientY = y;
        return mousedown;
    }

    it('should annotate mouse events with the cell they are on', function () {
        var mousedown = createEventWithXY('mousedown', 110, 40);
        grid.eventLoop.fire(mousedown);
        expect(mousedown.row).toBe(1);
        expect(mousedown.col).toBe(1);
    });

    it('should fire grid-drag-start on mousedown and then move', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-drag-start', spy);
        startDrag(function postDownFn() {
            expect(spy).not.toHaveBeenCalled();
        });
        expect(spy).toHaveBeenCalled();
        var dragEvent = spy.argsForCall[0][0];
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
        startSpy.reset();
        dragSpy.reset();
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
        var dragEvent = spy.argsForCall[0][0];
        expect(dragEvent.type).toBe('grid-drag');
        expect(dragEvent).rowToBe(1);
        expect(dragEvent).colToBe(1);
        expect(dragEvent.clientY).toBe(41);
        expect(dragEvent.clientX).toBe(111);
    });

    it('should fire grid-cell-drag event on move only when changing cells', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-cell-drag', spy);
        startDrag();
        expect(spy).not.toHaveBeenCalled();
        var mousemove = createEventWithXY('mousemove', 201, 41);
        window.dispatchEvent(mousemove);
        expect(spy).toHaveBeenCalled();
        var dragEvent = spy.argsForCall[0][0];
        expect(dragEvent.type).toBe('grid-cell-drag');
        expect(dragEvent).rowToBe(1);
        expect(dragEvent).colToBe(2);
        expect(dragEvent.clientY).toBe(41);
        expect(dragEvent.clientX).toBe(201);
        spy.reset();
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
        var dragEvent = spy.argsForCall[0][0];
        expect(dragEvent.type).toBe('grid-drag-end');
        expect(dragEvent).rowToBe(1);
        expect(dragEvent).colToBe(1);
        expect(dragEvent.clientY).toBe(41);
        expect(dragEvent.clientX).toBe(111);
    });
});