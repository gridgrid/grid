function testPositionRange(context) {
    describe('position-range', function () {
        var range;
        var parent;
        var dirtyPropsCtx = {
            props: ['top', 'left', 'height', 'width', 'units', 'space']
        };
        beforeEach(function () {
            range = context.range;
            parent = context.parent;
            dirtyPropsCtx.obj = range;
            dirtyPropsCtx.dirtyObjs = [range, parent];
        });

        it('should have the right defaults', function () {
            expect(range.isDirty).toBeAFunction();
            expect('top' in range).toBe(true);
            expect('left' in range).toBe(true);
            expect('height' in range).toBe(true);
            expect('width' in range).toBe(true);
            expect('units' in range).toBe(true);
            expect('space' in range).toBe(true);
        });

        describe('should satisfy', function () {
            require('../dirty-props/test-body')(dirtyPropsCtx);
        });
    });
}

module.exports = testPositionRange;