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

    it('should annotate mouse events with the cell they are on', function () {
        var mousedown = mockEvent('mousedown');
        //somewhere in the first cell hopefully
        mousedown.clientX = 110;
        mousedown.clientY = 40;
        grid.eventLoop.fire(mousedown);
        expect(mousedown.gridRow).toBe(1);
        expect(mousedown.gridCol).toBe(1);
    });
});