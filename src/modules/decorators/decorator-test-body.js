module.exports = function (ctx) {
    describe('single decorator', function () {

        var $ = require('jquery');
        var posRangeCtx = {};
        beforeEach(function () {
            posRangeCtx.range = ctx.decorator;
            posRangeCtx.parent = this.grid.decorators;
        });

        it('should have the right defaults', function () {
            expect(ctx.decorator.render).toBeAFunction();
        });

        describe('should satisfy', function () {
            require('../position-range/test-body')(posRangeCtx);
        });
    });
}