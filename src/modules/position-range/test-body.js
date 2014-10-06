function testPositionRange(context) {
    describe('position-range', function () {
        var range;
        var core;
        var parent;
        var dirtyPropsCtx = {props: ['top', 'left', 'height', 'width', 'units', 'space']};
        beforeEach(function () {
            range = context.range;
            core = context.core;
            parent = context.parent;
            dirtyPropsCtx.core = core;
            dirtyPropsCtx.obj = range;
            dirtyPropsCtx.parent = parent;
        });

        it('should have the right defaults', function () {
            expect(range.isDirty).toBeAFunction();
            expect('top' in range).toBe(true);
            expect('left' in range).toBe(true);
            expect('height' in range).toBe(true);
            expect('width' in range).toBe(true);
            expect(range.units).toBe('cell');
            expect(range.space).toBe('virtual');
        });

        require('@grid/add-dirty-props/test-body')(dirtyPropsCtx);
    });
}

module.exports = testPositionRange;