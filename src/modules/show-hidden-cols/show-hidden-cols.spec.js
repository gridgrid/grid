var mockEvent = require('../custom-event');
var specHelper = require('../grid-spec-helper');

describe('show-hidden-cols', function () {
    var $ = require('jquery');
    specHelper();
    beforeEach(function () {
        this.buildSimpleGrid();
        this.showHiddenCols = this.grid.showHiddenCols;
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

        it('should not register if it has no index', function () {
            var descriptor = this.grid.colModel.create();
            var add = spyOn(this.grid.decorators, 'add');
            descriptor.hidden = true;
            expect(add).not.toHaveBeenCalled();
        });

        it('should register on add if hidden', function () {
            var descriptor = this.grid.colModel.create();
            var add = spyOn(this.grid.decorators, 'add');
            descriptor.hidden = true;
            this.grid.colModel.add(descriptor);
            expect(add).toHaveBeenCalled();
        });

        it('should unregister on unhide', function () {
            this.grid.colModel.get(viewCol).hidden = false;
            var decorator = this.showHiddenCols._decorators[viewCol];
            expect(this.grid.decorators.getAlive()).not.toContain(decorator);
            expect(decorator).not.toBeDefined();
        });

        it('should add to the last visible column if at the end', function () {
            var length = this.grid.colModel.length(true);
            this.grid.colModel.get(length - 2).hidden = true;
            var lastCol = length - 1;
            this.grid.colModel.get(lastCol).hidden = true;
            var decorator = this.showHiddenCols._decorators[lastCol];
            expect(decorator).leftToBe(length - 3);
        });

        it('should center on the right side of its bounding box', function (done) {
            var lastCol = this.grid.colModel.length(true) - 1;
            this.grid.colModel.get(lastCol).hidden = true;
            this.viewBuild();
            var style = document.createElement('style');
            style.innerHTML = '.show-hidden-cols{width : 6px}';
            document.body.appendChild(style);
            this.onDraw(function () {
                var decorator = this.showHiddenCols._decorators[lastCol];
                var $rendered = $(decorator.boundingBox.firstChild);
                var $box = $(decorator.boundingBox);
                var width = $rendered.width();
                expect($rendered.position().left).toBe($box.width() - width / 2);
                document.body.removeChild(style);
                done();
            });
        });

        it('should center on the left side of its bounding box if first', function (done) {
            this.grid.colModel.get(0).hidden = true;
            this.viewBuild();
            var style = document.createElement('style');
            style.innerHTML = '.show-hidden-cols{width : 6px; height: 6px;}';
            document.body.appendChild(style);
            this.onDraw(function () {
                debugger;
                ctx.decorator = this.showHiddenCols._decorators[0];
                var $rendered = $(ctx.decorator.boundingBox.firstChild);
                var $box = $(ctx.decorator.boundingBox);
                var width = $rendered.width();
                var height = $rendered.height();
                expect($rendered.position().left).toBe(0 - width / 2);
                var boxHeight = $box.height();
                expect($rendered.position().top).toBe(Math.floor(boxHeight / 2) - height / 2);

                document.body.removeChild(style);
                done();
            });
        });

        it('should unhide all previous hidden on click', function (cb) {
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
