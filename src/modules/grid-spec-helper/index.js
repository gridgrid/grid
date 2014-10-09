module.exports = function () {
    var $ = require('jQuery');

    var helper = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols, varyHeight, varyWidths, fixedRows, fixedCols) {
            helper.grid = require('@grid/simple-grid')(numRows || 100, numCols || 10, varyHeight, varyWidths, fixedRows, fixedCols);
            helper.grid.viewPort.sizeToContainer(helper.container);
            return helper.grid;
        },
        viewBuild: function () {
            helper.grid.viewLayer.build(helper.container);
            return helper.container;
        },
        onDraw: function (fn) {
            waits(2);
            runs(fn);
        },
        resetAllDirties: function () {
            helper.grid.eventLoop.fire('grid-draw');
        },
        makeFakeRange: function (t, l, h, w) {
            return {top: t, left: l, height: h, width: w};
        }
    };

    beforeEach(function () {
        helper.container = document.createElement('div');
        $(helper.container).css({
            width: helper.CONTAINER_WIDTH + 'px',
            height: helper.CONTAINER_HEIGHT + 'px'
        });
        $('body').append(helper.container);
    });

    afterEach(function () {
        $(helper.container).remove();
    });

    return helper;

};
        