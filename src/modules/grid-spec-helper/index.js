module.exports = function () {
    var $ = require('jQuery');

    var helper = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols, varyHeight, varyWidths, fixedRows, fixedCols, headerRows, headerCols) {
            maybeDestroyGrid();
            helper.grid = require('@grid/simple-grid')(numRows || 100, numCols || 10, varyHeight, varyWidths, fixedRows, fixedCols, function (grid) {
                helper.resizeSpy = spyOn(grid.viewPort, '_resize');
            }, headerRows, headerCols);
            helper.grid.viewPort.sizeToContainer(helper.container);
            helper.grid.eventLoop.setContainer(helper.container);
            return helper.grid;
        },
        viewBuild: function () {
            helper.grid.viewLayer.build(helper.container);
            return helper.container;
        },
        onDraw: function (fn) {
            var hasBeenDrawn = false;
            runs(function () {
                helper.grid.eventLoop.bind('grid-draw', function () {
                    hasBeenDrawn = true;
                });
            });
            waitsFor(function () {
                return hasBeenDrawn;
            }, 'the view draw', 150);
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

    function maybeDestroyGrid() {
        if (helper.grid) {
            helper.grid.eventLoop.fire('grid-destroy');
            helper.grid = undefined;
        }
    }

    afterEach(function () {
        $('.js-grid-container').remove();
        maybeDestroyGrid();
    });

    return helper;

};
        