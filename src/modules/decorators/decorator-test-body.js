module.exports = function (ctx) {
    describe('single decorator', function () {

        var $ = require('jquery');
        var posRangeCtx = {helper: ctx.helper};
        beforeEach(function () {
            posRangeCtx.range = ctx.decorator;
            posRangeCtx.parent = ctx.helper.grid.decorators;
        });

        it('should have the right defaults', function () {
            expect(ctx.decorator.render).toBeAFunction();
        });

        it('should default render an element that fills the bounding box', function () {
            var div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.top = '5px';
            div.style.left = '6px';
            div.style.width = '25px';
            div.style.height = '35px';

            var decoratorElem = ctx.decorator.render();
            div.appendChild(decoratorElem);
            document.body.appendChild(div);
            expect($(decoratorElem).offset()).toEqual({
                top: 5,
                left: 6
            });

            expect($(decoratorElem).width()).toBe(25);
            expect($(decoratorElem).height()).toBe(35);
        });

        describe('should satisfy', function () {
            require('@grid/position-range/test-body')(posRangeCtx);
        });
    });
}