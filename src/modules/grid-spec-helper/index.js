module.exports = function () {
    window.requestAnimationFrame = function (fn) {
        return setTimeout(fn, 1);
    };

    window.cancelAnimationFrame = function (id) {
        return clearTimeout(id);
    };
    var $ = require('jquery');
    beforeEach(function () {

        this.CONTAINER_WIDTH = 800;
        this.CONTAINER_HEIGHT = 500;

        this.container = document.createElement('div');
        $(this.container).css({
            width: this.CONTAINER_WIDTH + 'px',
            height: this.CONTAINER_HEIGHT + 'px',
            position: 'absolute',
            top: '0px',
            left: '0px',
            bottom: '0px',
            right: '0px'
        }).addClass('js-grid-container');
        $('.js-grid-container').remove();
        $('body').append(this.container);

        var self = this;
        this.buildSimpleGrid = function (numRows, numCols, varyHeight, varyWidths, fixedRows, fixedCols, headerRows, headerCols, opts) {
            maybeDestroyGrid();
            this.grid = require('../simple-grid').create(numRows || 100, numCols || 10, varyHeight, varyWidths, fixedRows, fixedCols, function (grid) {
                self.resizeSpy = spyOn(grid.viewPort, '_resize');
            }, headerRows, headerCols, opts);
            this.grid.viewPort.sizeToContainer(this.container);
            this.grid.eventLoop.setContainer(this.container);
            return this.grid;
        };
        this.viewBuild = function () {
            this.grid.build(this.container);
            return this.container;
        };
        this.onDraw = function (fn) {
            var self = this;
            var unbind = this.grid.eventLoop.bindOnce('grid-draw', function () {
                setTimeout(function () {
                    fn.call(self);
                }, 1);
                unbind();
            });
        };
        this.resetAllDirties = function () {
            this.grid.eventLoop.fire('grid-draw');
        };
        this.makeFakeRange = function (t, l, h, w) {
            return {
                top: t,
                left: l,
                height: h,
                width: w
            };
        };
        this.spyOnUnbind = function () {
            var unbind = jasmine.createSpy();
            var bind = this.grid.eventLoop.bind;
            this.grid.eventLoop.bind = function () {
                bind.apply(bind, arguments);
                return unbind;
            };
            return unbind;
        };
    });

    function maybeDestroyGrid() {
        var grid = this.grid;
        if (grid) {
            grid.eventLoop.fire('grid-destroy');
            grid = undefined;
        }
    }

    afterEach(function () {
        $('.js-grid-container').remove();
        maybeDestroyGrid.call(this);
    });

};