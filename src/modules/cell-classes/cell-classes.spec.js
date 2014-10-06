var core = require('@grid/grid-spec-helper')();

describe('cell-classes', function () {
    var classes;
    beforeEach(function () {
        var grid = core.buildSimpleGrid();
        classes = grid.cellClasses;
    });

    describe('should create descriptors', function () {
        var descriptor;
        beforeEach(function () {
            descriptor = classes.create();
        });

        describe('that satisfy', function () {
            require('@grid/position-range/test-body')(function () {
                return {
                    range: descriptor,
                    core: core,
                    parent: classes
                };
            });
        });

    });

});