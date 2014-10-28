(function () {
    describe('col-sort', function () {


        var helper = require('@grid/grid-spec-helper')();
        var grid;
        beforeEach(function () {
            grid = helper.buildSimpleGrid();
        });

        it('should call data model toggle sort on click without drag', function () {
            var spy = spyOn(grid.dataModel, 'toggleSort');
            grid.eventLoop.fire('click');
            expect(spy).toHaveBeenCalled();
        });

    });
})();