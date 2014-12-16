var mockEvent = require('../custom-event');
var specHelper = require('../grid-spec-helper');

ddescribe('show-hidden-cols', function () {
    var $ = require('jquery');
    specHelper();
    beforeEach(function () {
        this.buildSimpleGrid();
        this.showHiddenCols = this.grid.showHiddenCols;
    });

    describe('should satisfy', function () {
        var ctx = {};
        beforeEach(function () {
            ctx.headerDecorators = this.showHiddenCols;
        });

        //covers the decorator interface
        require('../header-decorators/test-body')(ctx);
    });

    describe('decorator', function () {
        var ctx = {};
        var viewCol = 1;
        beforeEach(function () {
            this.grid.colModel.get(viewCol).hidden = true;
            ctx.decorator = this.showHiddenCols._decorators[viewCol];
        });

        it('should have a styleable class', function () {
            expect(ctx.decorator.render()).toHaveClass('show-hidden-cols');
        });

        it('should register for new hidden cols', function () {
            this.grid.colModel.get(2).hidden = true;
            var decorator = this.showHiddenCols._decorators[2];
            expect(this.grid.decorators.getAlive()).toContain(decorator);
            expect(decorator).toBeDefined();
        });

        it('should unregister on unhide', function () {
            this.grid.colModel.get(viewCol).hidden = false;
            var decorator = this.showHiddenCols._decorators[viewCol];
            expect(this.grid.decorators.getAlive()).not.toContain(decorator);
            expect(decorator).not.toBeDefined();
        });

        it('should center on the right side of its bounding box', function (done) {
            this.viewBuild();
            var style = document.createElement('style');
            style.innerHTML = '.show-hidden-cols{width : 6px}';
            document.body.appendChild(style);
            this.onDraw(function () {
                var $rendered = $(ctx.decorator.boundingBox.firstChild);
                var $box = $(ctx.decorator.boundingBox);
                var width = $rendered.width();
                expect($rendered.position().left).toBe($box.width() - width / 2);
                expect($rendered.position().top).toBe(0);
                expect($rendered.height()).toBe($box.height());
                document.body.removeChild(style);
                done();
            });
        });

        iit('should unhide all previous hidden on click', function (cb) {
            this.grid.colModel.get(2).hidden = true;
            this.viewBuild();
            this.onDraw(function () {
                this.showHiddenCols._decorators[2].boundingBox.firstChild.dispatchEvent(mockEvent('click'));
                expect(this.grid.colModel.get(1).hidden).toBe(false);
                expect(this.grid.colModel.get(2).hidden).toBe(false);
                cb();
            });
        });

    });

});