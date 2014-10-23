module.exports = function (ctx) {
    describe('single decorator', function () {

        var $ = require('jquery');
        var posRangeCtx = {};
        beforeEach(function () {
            posRangeCtx.helper = ctx.helper;
            posRangeCtx.range = ctx.decorator;
            posRangeCtx.parent = ctx.helper.grid.decorators;
        });

        it('should have the right defaults', function () {
            expect(ctx.decorator.render).toBeAFunction();
        });

        describe('should satisfy', function () {
            require('@grid/position-range/test-body')(posRangeCtx);
        });
    });
}