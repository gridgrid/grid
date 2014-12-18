function testHeaderDecorators() {
    describe('header-decorators', function (ctx) {

        require('../grid-spec-helper')();
        var grid;
        var headerDecorators;
        beforeEach(function () {
            grid = ctx && this.grid || this.buildSimpleGrid();
            headerDecorators = ctx && ctx.headerDecorators || require('../header-decorators')(grid);
        });

        describe('decorator', function () {
            var ctx = {};
            var viewCol = 1;
            beforeEach(function () {
                ctx.decorator = headerDecorators._decorators[viewCol];
            });

            describe('should satisfy', function () {
                require('../decorators/decorator-test-body')(ctx);
            });

            it('should have the right range', function () {
                expect(ctx.decorator).topToBe(0);
                expect(ctx.decorator).heightToBe(1);
                expect(ctx.decorator).widthToBe(1);
                expect(ctx.decorator).unitsToBe('cell');
                expect(ctx.decorator).spaceToBe('real');
            });
        });

        function expectCorrectDecorators() {
            for (var c = 0; c < grid.viewPort.cols; c++) {
                var decorator = headerDecorators._decorators[c];
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

        it('should call an optional annotate function', function () {
            var spy = jasmine.createSpy();
            headerDecorators.annotateDecorator = spy;
            grid.viewPort.cols = grid.viewPort.cols + 1;
            grid.eventLoop.fire('grid-viewport-change');
            expect(spy).toHaveBeenCalled();
        });

        it('should call makeDecorator on the api so it can be overridden if need be', function () {

            var spy = spyOn(headerDecorators, 'makeDecorator').and.callThrough();
            grid.viewPort.cols = grid.viewPort.cols + 1;
            grid.eventLoop.fire('grid-viewport-change');
            expect(spy).toHaveBeenCalled();
        });

    });
}
module.exports = testHeaderDecorators;