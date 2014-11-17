describe('range-util', function () {
    require('../grid-spec-helper')();
    var util;
    beforeEach(function () {
        util = require('../range-util');
    });

    describe('intersect', function () {
        it('should return null for non intersecting ranges', function () {
            expect(util.intersect([0, 5], [5, 1])).toBe(null);
            expect(util.intersect([0, 1], [-1, 1])).toBe(null);
        });

        it('should return the intersection', function () {
            expect(util.intersect([0, 5], [4, 1])).toEqual([4, 1]);
            expect(util.intersect([0, 5], [4, 4])).toEqual([4, 1]);
            expect(util.intersect([0, 5], [4, Infinity])).toEqual([4, 1]);
            expect(util.intersect([4, 4], [0, 5])).toEqual([4, 1]);
        });
    });

    describe('union', function () {
        it('should return the lowest start index and the span of the range', function () {
            expect(util.union([0, 5], [4, 1])).toEqual([0, 5]);
            expect(util.union([0, 5], [4, 4])).toEqual([0, 8]);
            expect(util.union([0, 5], [4, Infinity])).toEqual([0, Infinity]);
            expect(util.union([4, 4], [0, 5])).toEqual([0, 8]);
        });

        it('should handle abutting ranges', function () {
            expect(util.union([0, 1], [1, 5])).toEqual([0, 6]);
        });

        it('should handle null', function () {
            expect(util.union([0, 5], null)).toEqual([0, 5]);
            expect(util.union(null, [0, 5])).toEqual([0, 5]);
            expect(util.union(null, null)).toEqual(null);
        });
    });

    describe('createFromPoints', function () {
        it('should create a range from ordered points', function () {
            expect(util.createFromPoints(2, 3, 5, 6)).rangeToBe(2, 3, 4, 4);
        });

        it('should create a range from out of order points', function () {
            expect(util.createFromPoints(5, 6, 2, 3)).rangeToBe(2, 3, 4, 4);
        });
    });
});