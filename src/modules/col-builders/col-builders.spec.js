(function () {
    describe('col-builders', function () {


        require('@grid/grid-spec-helper')();
        var grid;
        var builders;
        beforeEach(function () {
            grid =this.buildSimpleGrid();
            builders = grid.colBuilders;
        });

        describe('dom builder', function () {

            it('should let me create a dom builder', function () {
                var render = function () {
                };
                var update = function () {
                };
                var builder = builders.create(render, update);
                expect(builder).toBeDefined();
                expect(builder.render).toBe(render);
                expect(builder.update).toBe(update);
            });

            it('should default to empty functions', function () {
                var builder = builders.create();
                expect(builder.render).toBeAFunction();
                expect(builder.update).toBeAFunction();
            });
        });

        it('should let me set and get a dom builder for a col', function () {
            var render = function () {
            };
            var update = function () {
            };
            var builder = builders.create(render, update);
            builders.set(2, builder);
            expect(builders.get(2)).toBeDefined();
            expect(builders.get(2).render).toBe(render);
            expect(builders.get(2).update).toBe(update);
        });

        it('should be dirty on set', function () {
           this.resetAllDirties();
            builders.set(2, builders.create());
            expect(builders).toBeDirty();
        });

    });
})();