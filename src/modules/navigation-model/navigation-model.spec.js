var mockEvent = require('@grid/custom-event');
var key = require('key');

describe('navigation-model', function () {
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var grid;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        model = grid.navigationModel;
    });

    function expectRowCol(r, c) {
        expect(model).rowToBe(r);
        expect(model).colToBe(c);
    }

    it('should start at 0, 0', function () {
        expectRowCol(0, 0);
    });

    it('should let me set it', function () {
        model.navTo(2, 3);
        expectRowCol(2, 3);
    });

    function makeAndFireKeyDown(code) {
        var moveDown = mockEvent('keydown');
        moveDown.which = code;
        grid.eventLoop.fire(moveDown);
    }

    it('should move around by one on keydowns', function () {
        makeAndFireKeyDown(key.code.arrow.down.code);
        expectRowCol(1, 0);
        makeAndFireKeyDown(key.code.arrow.right.code);
        expectRowCol(1, 1);
        makeAndFireKeyDown(key.code.arrow.up.code);
        expectRowCol(0, 1);
        makeAndFireKeyDown(key.code.arrow.left.code);
        expectRowCol(0, 0);
    });

    it('should register a cell class for focus', function () {
        var spy = spyOn(grid.cellClasses, 'add');
        require('@grid/navigation-model')(grid);
        expect(spy).toHaveBeenCalled();
        var descriptor = spy.argsForCall[0][0];
        expect(descriptor).unitsToBe('cell');
        expect(descriptor).spaceToBe('virtual');
        expect(descriptor).classToBe('focus');
    });

    it('should move the cell class on navigation', function () {
        var spy = spyOn(grid.cellClasses, 'add');
        var model = require('@grid/navigation-model')(grid);
        expect(spy).toHaveBeenCalled();
        var descriptor = spy.argsForCall[0][0];
        model.navTo(2, 3);
        expect(descriptor).topToBe(2);
        expect(descriptor).leftToBe(3);
    });

    it('should have a min and max row and col that it respects', function () {
        model.minRow = 1;
        model.minCol = 1;
        model.maxRow = 4;
        model.maxCol = 3;
        model.navTo(0, 0);
        expect(model).rowToBe(1);
        expect(model).colToBe(1);

        model.navTo(10, 10);
        expect(model).rowToBe(4);
        expect(model).colToBe(3);
    });

    it('should reflect min on set', function () {
        model.navTo(0, 0);
        model.minRow = 1;
        expect(model).rowToBe(1);
        model.minCol = 1;
        expect(model).colToBe(1);
    });

    it('should reflect max on set', function () {
        model.navTo(Infinity, Infinity);
        model.maxRow = 1;
        expect(model).rowToBe(1);
        model.maxCol = 1;
        expect(model).colToBe(1);
    });

    it('should try to scroll the cell into view on nav', function () {
        var spy = spyOn(grid.cellScrollModel, 'scrollIntoView');
        model.navTo(1, 1);
        expect(spy).toHaveBeenCalledWith(1, 1);
    });

    it('should navigate on mousedown', function () {
        var mouseDown = mockEvent('mousedown');
        var col = 3;
        var row = 4;
        mouseDown.clientX = col * 100 + 1;
        mouseDown.clientY = row * 30 + 1;
        grid.eventLoop.fire(mouseDown);
        expect(model).rowToBe(row);
        expect(model).colToBe(col);
    });
});