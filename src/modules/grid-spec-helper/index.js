module.exports = function () {
    var $ = require('jQuery');

    var core = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols, varyWidths) {
            core.grid = require('@grid/simple-grid')(numRows || 100, numCols || 10, varyWidths);
            return core.grid;
        },
        viewBuild: function () {
            core.grid.viewLayer.build(core.container);
            return core.container;
        },
        onDraw: function (fn) {
            waits(2);
            runs(fn);
        },
        resetAllDirties: function () {
            core.grid.eventLoop.fire('grid-draw');
        }
    };

    beforeEach(inject(function () {
        core.container = document.createElement('div');
        $(core.container).css({
            width: core.CONTAINER_WIDTH + 'px',
            height: core.CONTAINER_HEIGHT + 'px'
        });
        $('body').append(core.container);
    }));

    afterEach(function () {
        $(core.container).remove();
    });

    return core;

};
        