var mockEvent = require('@grid/custom-event');

describe('col-resize', function () {
    var $ = require('jquery');

    var helper = require('@grid/grid-spec-helper')();
    var grid;
    var colResize;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        colResize = grid.colResize;
    });

    describe('decorator', function () {
        var ctx = {};
        beforeEach(function () {
            ctx.helper = helper;
            ctx.decorator = colResize._decorators[0];
        });

        describe('should satisfy', function () {
            require('@grid/decorators/decorator-test-body')(ctx);
        });

        it('should have the right range', function () {
            expect(ctx.decorator).topToBe(0);
            expect(ctx.decorator).heightToBe(1);
            expect(ctx.decorator).widthToBe(1);
            expect(ctx.decorator).unitsToBe('cell');
            expect(ctx.decorator).spaceToBe('real');
        });

        it('should have a styleable class', function () {
            expect(ctx.decorator.render()).toHaveClass('col-resize');
        });

        it('should center on the right side of its bounding box', function () {
            helper.viewBuild();
            var style = document.createElement('style');
            style.innerHTML = '.col-resize{width : 6px}';
            document.body.appendChild(style);
            helper.onDraw(function () {
                var $rendered = $(ctx.decorator.boundingBox.firstChild);
                var $box = $(ctx.decorator.boundingBox);
                var width = $rendered.width();
                expect($rendered.position().left).toBe($box.width() - width / 2);
                expect($rendered.position().top).toBe(0);
                expect($rendered.height()).toBe($box.height());
                document.body.removeChild(style);
            });
        });

        it('should bind a drag event on render', function () {
            var spy = spyOn(grid.eventLoop, 'bind');
            var dragElem = ctx.decorator.render();
            expect(spy).toHaveBeenBoundWith('grid-drag-start', dragElem);
        });

        describe('drag', function () {
            var dragCtx = {};
            beforeEach(function () {
                dragCtx.helper = helper;
                ctx.decorator._onDragStart(mockEvent('grid-drag-start', true));
                dragCtx.decorator = ctx.decorator._dragLine;
            });

            it('should add a decorator', function () {
                expect(grid.decorators.getAlive()).toContain(ctx.decorator._dragLine);
            });
            
            it('should start out at the gridX of the drag start', function(){
                
            });

            describe('should satisfy', function () {
                require('@grid/decorators/decorator-test-body')(dragCtx);
            });
        });

    });

    function expectCorrectDecorators() {
        for (var c = 0; c < grid.viewPort.cols; c++) {
            var decorator = colResize._decorators[c];
            expect(decorator).toBeDefined();
            expect(decorator.left).toBe(c);
            expect(grid.decorators.getAlive()).toContain(decorator);
        }
    }

    it('should make viewport cols decorators', function () {
        expectCorrectDecorators();
    });

    it('should still have the right number of decorators after viewport changes', function () {
        grid.viewPort.sizeToContainer({offsetWidth: 200, offsetHeight: 300});
        expectCorrectDecorators();
    });


});