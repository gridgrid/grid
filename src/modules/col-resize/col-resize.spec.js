var mockEvent = require('../custom-event');
var specHelper = require('../grid-spec-helper');

describe('col-resize', function() {
    var $ = require('jquery');


    specHelper();
    var grid;
    var colResize;
    beforeEach(function() {
        grid = this.buildSimpleGrid();
        colResize = grid.colResize;
    });

    describe('decorator', function() {
        var ctx = {};
        var viewCol = 1;
        beforeEach(function() {
            ctx.decorator = colResize._decorators[viewCol];
        });

        it('should have a styleable class', function() {
            expect(ctx.decorator.render()).toHaveClass('col-resize');
        });

        it('should center on the right side of its bounding box', function(done) {
            this.viewBuild();
            var style = document.createElement('style');
            style.innerHTML = '.col-resize{width : 6px}';
            document.body.appendChild(style);
            this.onDraw(function() {
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

        it('should bind a drag event on render', function() {
            var spy = spyOn(grid.eventLoop, 'bind');
            var dragElem = ctx.decorator.render();
            expect(spy).toHaveBeenBoundWith('grid-drag-start', dragElem);
        });

        describe('drag', function() {
            var dragCtx = {};
            var dragStart = 100;
            beforeEach(function() {
                var e = mockEvent('grid-drag-start', true);
                e.gridX = dragStart;
                ctx.decorator._onDragStart(e);
                dragCtx.decorator = ctx.decorator._dragLine;
            });

            it('should add a decorator', function() {
                expect(grid.decorators.getAlive()).toContain(ctx.decorator._dragLine);
            });

            it('should be 1px wide and as tall as teh view', function() {
                expect(dragCtx.decorator).topToBe(0);
                expect(dragCtx.decorator).widthToBe(1);
                expect(dragCtx.decorator).heightToBe(Infinity);
                expect(dragCtx.decorator).unitsToBe('px');
                expect(dragCtx.decorator).spaceToBe('real');
            });

            it('should render with a styleable class', function() {
                expect(dragCtx.decorator.render()).toHaveClass('grid-drag-line');
            });

            function fireDrag(x) {
                var drag = mockEvent('grid-drag');
                var gridX = x;
                drag.gridX = gridX;
                grid.eventLoop.fire(drag);
                return gridX;
            }

            it('should move the left on grid drag', function() {
                var gridX = fireDrag(dragStart + 10);
                expect(dragCtx.decorator).leftToBe(gridX);
            });

            it('should min out at decorator left + 22', function(done) {
                $(this.container).css({
                    'margin-left': '22px'
                });
                this.viewBuild();
                this.onDraw(function() {
                    var drag = mockEvent('grid-drag');
                    var decoratorLeft = grid.viewPort.toGridX(ctx.decorator.boundingBox.getClientRects()[0].left);
                    var gridX = decoratorLeft;
                    drag.gridX = gridX;
                    grid.eventLoop.fire(drag);
                    expect(dragCtx.decorator)
                        .leftToBe(decoratorLeft + 22);
                    done();
                });

            });

            it('should remove the decorator on drag end', function() {
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                expect(grid.decorators.popAllDead()).toContain(dragCtx.decorator);
            });

            it('should set the col width on drag-end', function() {
                fireDrag(dragStart + 10);
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                var colObj = grid.colModel.get(viewCol);
                expect(colObj).widthToBe(dragStart + 10);
            });

            it('should set the col width on drag-end for all selected cols', function() {
                var newWidth = dragStart + 10;
                fireDrag(newWidth);
                var selected = viewCol + 2;
                grid.colModel.select(selected)
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                var colObj = grid.colModel.get(viewCol);
                expect(colObj).widthToBe(newWidth);
                expect(grid.colModel.get(selected)).widthToBe(newWidth);
            });

            it('should set the correct width if scrolled', function() {
                var colScroll = 1;
                grid.cellScrollModel.scrollTo(0, colScroll);
                fireDrag(dragStart + 10);
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                var colObj = grid.colModel.get(viewCol + colScroll);
                expect(colObj).widthToBe(dragStart + 10);
            });

            describe('should satisfy', function() {
                require('../decorators/decorator-test-body')(dragCtx);
            });
        });

    });

});