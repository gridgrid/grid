module.exports = function () {
    var $ = require('jQuery');

    var helper = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols, varyHeight, varyWidths, fixedRows, fixedCols) {
            helper.grid = require('@grid/simple-grid')(numRows || 100, numCols || 10, varyHeight, varyWidths, fixedRows, fixedCols);
            helper.grid.viewPort.sizeToContainer(helper.container);
            helper.grid.eventLoop.setContainer(helper.container);
            helper.resizeSpy = spyOn(helper.grid.viewPort, '_onResize');
            return helper.grid;
        },
        viewBuild: function () {
            helper.grid.viewLayer.build(helper.container);
            return helper.container;
        },
        onDraw: function (fn) {
            waits(10);
            runs(fn);
        },
        resetAllDirties: function () {
            helper.grid.eventLoop.fire('grid-draw');
        },
        makeFakeRange: function (t, l, h, w) {
            return {top: t, left: l, height: h, width: w};
        },
        spyOnUnbind: function () {
            var unbind = jasmine.createSpy();
            var bind = helper.grid.eventLoop.bind;
            helper.grid.eventLoop.bind = function () {
                bind.apply(bind, arguments);
                return unbind;
            };
            return unbind;
        }
    };

    beforeEach(function () {
        helper.container = document.createElement('div');
        $(helper.container).css({
            width: helper.CONTAINER_WIDTH + 'px',
            height: helper.CONTAINER_HEIGHT + 'px',
            position: 'absolute',
            top: '0px',
            left: '0px',
            bottom: '0px',
            right: '0px'
        }).addClass('js-grid-container');
        $('.js-grid-container').remove();
        $('body').append(helper.container);
    });

    afterEach(function () {
        $('.js-grid-container').remove();
        if (helper.grid) {
            helper.grid.eventLoop.fire('grid-destroy');
        }
    });

    return helper;

};
        