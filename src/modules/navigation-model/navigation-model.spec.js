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

    it('should start at 0, 0', function () {
        expect(model.row).toBe(0);
        expect(model.col).toBe(0);
    });

    function makeAndFireKeyDown(code) {
        var moveDown = mockEvent('keydown');
        moveDown.which = code;
        grid.eventLoop.fire(moveDown);
    }

    it('should move around by one on keydowns', function () {
        makeAndFireKeyDown(key.code.arrow.down);
        expect(model).rowToBe(1);
        expect(model).colToBe(0);
        makeAndFireKeyDown(key.code.arrow.right);
        expect(model).rowToBe(1);
        expect(model).colToBe(1);
        makeAndFireKeyDown(key.code.arrow.up);
        expect(model).rowToBe(0);
        expect(model).colToBe(1);
        makeAndFireKeyDown(key.code.arrow.left);
        expect(model).rowToBe(0);
        expect(model).colToBe(0);
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
});