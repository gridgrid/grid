describe('util', function () {

    var util;
    beforeEach(function () {
        util = require('../util');
    });

    describe('clamp', function () {
        it('should do nothing to a number in the range', function () {
            expect(util.clamp(5, 0, 10)).toEqual(5);
        });

        it('should reduce a number above the range to the max', function () {
            expect(util.clamp(11, 0, 10)).toEqual(10);
        });

        it('should raise a number below the range to the min', function () {
            expect(util.clamp(-1, 0, 10)).toEqual(0);
        });

        it('should do nothing to a number at the range endpoints', function () {
            expect(util.clamp(0, 0, 10)).toEqual(0);
            expect(util.clamp(10, 0, 10)).toEqual(10);
        });

        it('should have the option to return NaN for numbers outside the range', function () {
            expect(util.clamp(11, 0, 10, true)).toBeNaN();
            expect(util.clamp(-1, 0, 10, true)).toBeNaN();
        });

        it('should clamp if both numbers are the same', function () {
            expect(util.clamp(99, 0, 0)).toBe(0);
        });
    });

    describe('position', function () {
        it('should position an element absolutely', function () {
            var div = document.createElement('div');
            util.position(div, 2, 3, 4, 5);
            expect(div).toBePositioned(2, 3, 4, 5);
        });
    });


});