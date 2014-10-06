var core = require('@grid/grid-spec-helper')();

describe('cell-classes', function () {
    var classes;
    beforeEach(function () {
        var grid = core.buildSimpleGrid();
        classes = grid.cellClasses;
    });

    describe('should satisfy', function () {
        require('@grid/position-range/test-body')(function () {
            return {
                range: classes,
                core: core
            };
        });
    });

});