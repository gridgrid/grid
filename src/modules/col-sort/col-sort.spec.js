(function () {
    var mockEvent = require('../custom-event');
    xdescribe('col-sort', function () {


        require('../grid-spec-helper')();
        var grid;
        beforeEach(function () {
            grid =this.buildSimpleGrid();
        });

        it('should call data model toggle sort on click without drag', function () {
            var spy = spyOn(grid.dataModel, 'toggleSort');
            var click = mockEvent('click');
            click.clientY = 1;
            grid.eventLoop.fire(click);
            expect(spy).toHaveBeenCalled();
        });

        it('should not call sort for clicks outside the header area', function () {
            var spy = spyOn(grid.dataModel, 'toggleSort');
            var click = mockEvent('click');
            click.clientY = 100;
            grid.eventLoop.fire(click);
            expect(spy).not.toHaveBeenCalled();
        });

    });
})();