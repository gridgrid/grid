function testPositionRange(beforeEachFn) {
    describe('position-range', function () {
        var range;
        var core;
        var parent;
        beforeEach(function () {
            var models = beforeEachFn();
            range = models.range;
            core = models.core;
            parent = models.parent;
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

        function setPropAndCheckDirty(prop, val) {
            core.resetAllDirties();
            expect(range.isDirty()).toBe(false);
            if (parent) {
                expect(parent.isDirty()).toBe(false);
            }
            range[prop] = val;
            expect(range.isDirty()).toBe(true);
            if (parent) {
                expect(parent.isDirty()).toBe(true);
            }
        }

        it('should get marked dirty on relevant property changes', function () {
            ['top', 'left', 'height', 'width', 'units', 'space'].forEach(function (prop) {
                setPropAndCheckDirty(prop, 1); //any value should do    
            });
        });
    });
}

module.exports = testPositionRange;