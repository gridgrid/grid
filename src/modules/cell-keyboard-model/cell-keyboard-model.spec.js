var mockEvent = require('../custom-event');

describe('cell-keyboard-model', function() {

    require('../grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    var beforeEachFunction = function(fixedR, fixedC, hRows, hCols) {
        grid = this.buildSimpleGrid(numRows, numCols, false, false, fixedR, fixedC, hRows, hCols);
        //set container without building to save perf
        grid.container = this.container;
        model = grid.cellKeyboardModel;
    };


    function createEvent(name) {
        var mouseEvent = mockEvent(name);
        //somewhere in the first cell hopefully
        mouseEvent.currentTarget = grid.container;
        return mouseEvent;
    }

    var annotatedEvents = ['keydown', 'keypress', 'keyup'];

    describe('general', function() {
        beforeEach(function() {
            beforeEachFunction.call(this, 0, 0, 1, 1);
        });

        it('should annotate key events with the current focus cell', function() {
            grid.navigationModel.setFocus(3, 4);
            grid.cellScrollModel.scrollTo(2, 2);
            annotatedEvents.forEach(function(type) {
                var event = createEvent(type);
                model._annotateEvent(event);
                expect(event).rowToBe(3);
                expect(event).colToBe(4);
                expect(event.realRow).toBe(2);
                expect(event.realCol).toBe(3);
                expect(event.virtualRow).toBe(4);
                expect(event.virtualCol).toBe(5);
            });
        });


    });

});
