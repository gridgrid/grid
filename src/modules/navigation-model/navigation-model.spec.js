var mockEvent = require('@grid/custom-event');
var key = require('key');

describe('navigation-model', function () {
    var core = require('@grid/grid-spec-helper')();
    var model;
    var grid;
    beforeEach(function () {
        grid = core.buildSimpleGrid();
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
        makeAndFireKeyDown(key.code.arrow.down);
        expectRowCol(1, 0);
        makeAndFireKeyDown(key.code.arrow.right);
        expectRowCol(1, 1);
        makeAndFireKeyDown(key.code.arrow.up);
        expectRowCol(0, 1);
        makeAndFireKeyDown(key.code.arrow.left);
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
});