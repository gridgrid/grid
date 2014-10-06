var core = require('@grid/grid-spec-helper')();

describe('cell-classes', function () {
    var classes;
    beforeEach(function () {
        var grid = core.buildSimpleGrid();
        classes = grid.cellClasses;
    });

    describe('should create descriptors', function () {
        var descriptor;
        var ctx = {core: core};
        beforeEach(function () {
            ctx.range = descriptor = classes.create();
            ctx.parent = classes;
        });

        describe('that satisfy', function () {
            require('@grid/position-range/test-body')(ctx);
        });

    });

});