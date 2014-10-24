var mockEvent = require('@grid/custom-event');


describe('col-reorder', function () {
    var $ = require('jquery');

    var helper = require('@grid/grid-spec-helper')();
    var grid;
    var colReorder;
    beforeEach(function () {
        grid = helper.buildSimpleGrid();
        colReorder = grid.colReorder;
    });

    describe('should satisfy', function () {
        var ctx = {};
        beforeEach(function () {
            ctx.helper = helper;
            ctx.headerDecorators = colReorder;
        });

        //covers the decorator interface
        require('@grid/header-decorators/header-decorators.spec')(ctx);
    });

    describe('decorator', function () {
        var ctx = {};
        var col = 1;
        beforeEach(function () {
            ctx.helper = helper;
            ctx.decorator = colReorder._decorators[col];
        });

        it('should have a styleable class', function () {
            expect(ctx.decorator.render()).toHaveClass('grid-col-reorder');
        });

        it('should bind a drag event on render', function () {
            var spy = spyOn(grid.eventLoop, 'bind');
            var dragElem = ctx.decorator.render();
            expect(spy).toHaveBeenBoundWith('grid-drag-start', dragElem);
        });

        describe('drag', function () {
            var dragCtx = {};
            var dragStart = 90;

            function startDrag() {
                var e = mockEvent('grid-drag-start', true);
                e.gridX = dragStart;
                ctx.decorator._onDragStart(e);
            }

            beforeEach(function () {
                dragCtx.helper = helper;
                startDrag();
                dragCtx.decorator = ctx.decorator._dragRect;
            });

            it('should add a decorator', function () {
                expect(grid.decorators.getAlive()).toContain(ctx.decorator._dragRect);
            });

            it('should be 1px wide and as tall as teh view', function () {
                expect(dragCtx.decorator).topToBe(0);
                expect(dragCtx.decorator).heightToBe(Infinity);
                expect(dragCtx.decorator).unitsToBe('px');
                expect(dragCtx.decorator).spaceToBe('real');
            });

            it('should render with a styleable class', function () {
                expect(dragCtx.decorator.render()).toHaveClass('grid-drag-rect');
            });

            function fireDrag(x) {
                var drag = mockEvent('grid-drag');
                var gridX = x;
                drag.gridX = gridX;
                grid.eventLoop.fire(drag);
                return gridX;
            }

            it('should set width on drag start', function () {
                expect(dragCtx.decorator).widthToBe(100);
                grid.colModel.get(col).width = 10;
                startDrag();
                expect(dragCtx.decorator).widthToBe(10);
            });

            it('should move the left on grid drag', function () {
                var gridX = fireDrag(dragStart + 5);
                var colLeft = 0
                expect(dragCtx.decorator).leftToBe(colLeft + 5);
            });

            it('should remove the decorator on drag end', function () {
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                expect(grid.decorators.popAllDead()).toContain(dragCtx.decorator);
            });


            describe('should satisfy', function () {
                require('@grid/decorators/decorator-test-body')(dragCtx);
            });
        });

    });


});