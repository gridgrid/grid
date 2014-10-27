var mockEvent = require('@grid/custom-event');


describe('col-reorder', function () {

    var helper = require('@grid/grid-spec-helper')();
    var grid;
    var colReorder;
    var beforeEachFn = function (fixedR, fixedC) {
        grid = helper.buildSimpleGrid(undefined, undefined, undefined, undefined, fixedR, fixedC);
        colReorder = grid.colReorder;
    };
    beforeEach(beforeEachFn);

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

        var dragStart = 105;

        function startDrag() {
            var e = mockEvent('grid-drag-start', true);
            e.gridX = dragStart;
            e.realCol = grid.viewPort.getColByLeft(dragStart);
            ctx.decorator._onDragStart(e);

        }

        function fireDrag(x) {
            var drag = mockEvent('grid-drag');
            var gridX = x;
            drag.gridX = gridX;
            drag.realCol = grid.viewPort.getColByLeft(gridX);
            grid.eventLoop.fire(drag);
            return gridX;
        }

        describe('drag', function () {
            var dragCtx = {};


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

            it('should set width on drag start', function () {
                expect(dragCtx.decorator).widthToBe(100);
                grid.colModel.get(col).width = 10;
                startDrag();
                expect(dragCtx.decorator).widthToBe(10);
            });

            it('should move the left on grid drag', function () {
                fireDrag(dragStart + 5);
                var colLeft = 0;
                expect(dragCtx.decorator).leftToBe(colLeft + 5);
            });

            describe('target col', function () {
                var targetCtx = {};
                beforeEach(function () {
                    targetCtx.helper = helper;
                    targetCtx.decorator = dragCtx.decorator._targetCol;
                    targetCtx.decorator.render(); //mock the render so we don't have to wait for the entire view in test
                    fireDrag(205);
                });

                describe('should satisfy', function () {
                    require('@grid/decorators/decorator-test-body')(targetCtx);
                });

                it('should add a decorator', function () {
                    expect(grid.decorators.getAlive()).toContain(targetCtx.decorator);
                });

                it('should set the target column to the one youre hovering', function () {
                    expect(targetCtx.decorator).leftToBe(2);
                    expect(targetCtx.decorator).widthToBe(1);
                    expect(targetCtx.decorator).topToBe(0);
                    expect(targetCtx.decorator).heightToBe(Infinity);
                    expect(targetCtx.decorator).unitsToBe('cell');
                    expect(targetCtx.decorator).spaceToBe('real');
                });

                it('should have a style class', function () {
                    expect(targetCtx.decorator._renderedElem).toHaveClass('grid-reorder-target');
                });

                it('should have a right class if to the right of the start col', function () {
                    expect(targetCtx.decorator._renderedElem).toHaveClass('right');
                });

                it('should have remove the right class if on the elem', function () {
                    fireDrag(105);
                    expect(targetCtx.decorator._renderedElem).not.toHaveClass('right');
                });

                it('should have remove the right class if left of the elem', function () {
                    fireDrag(95);
                    expect(targetCtx.decorator._renderedElem).not.toHaveClass('right');
                });

                it('should move the column to the target column on drag end', function () {
                    var colScroll = 1;
                    grid.cellScrollModel.scrollTo(0, colScroll);
                    var originalCol = grid.colModel.get(col + colScroll);
                    grid.eventLoop.fire(mockEvent('grid-drag-end'));
                    expect(grid.colModel.get(2 + colScroll)).toBe(originalCol);
                });


                it('should remove the decorator on drag end', function () {
                    grid.eventLoop.fire(mockEvent('grid-drag-end'));
                    expect(grid.decorators.popAllDead()).toContain(targetCtx.decorator);
                });
            });


            it('should remove the decorator on drag end', function () {
                grid.eventLoop.fire(mockEvent('grid-drag-end'));
                expect(grid.decorators.popAllDead()).toContain(dragCtx.decorator);
            });


            describe('should satisfy', function () {
                require('@grid/decorators/decorator-test-body')(dragCtx);
            });
        });

        describe('fixed cols', function () {
            beforeEach(function () {
                beforeEachFn(1, 3);
                ctx.decorator = colReorder._decorators[col];
            });

            it('should not drag fixed columns', function () {
                startDrag();
                expect(grid.decorators.getAlive()).not.toContain(ctx.decorator._dragRect);
            });

            it('should not allow me to drag into the fixed range', function () {
                dragStart = 305;
                startDrag();
                fireDrag(105);
                expect(ctx.decorator._dragRect._targetCol).leftToBe(3);
                expect(ctx.decorator._dragRect).leftToBe(grid.viewPort.getColLeft(3));
            });
        });

    });


});