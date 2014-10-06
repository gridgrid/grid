module.exports = function (context) {
    var core;
    var obj;
    var parent;
    var props;
    beforeEach(function () {
        core = context.core;
        obj = context.obj;
        parent = context.parent;
        props = context.props;
    });

    describe('add-dirty-props', function () {
        function setPropAndCheckDirty(prop, val) {
            core.resetAllDirties();
            expect(obj.isDirty()).toBe(false);
            if (parent) {
                expect(parent.isDirty()).toBe(false);
            }
            obj[prop] = val;
            expect(obj.isDirty()).toBe(true);
            if (parent) {
                expect(parent.isDirty()).toBe(true);
            }
        }

        it('should get marked dirty on relevant property changes', function () {
            props.forEach(function (prop) {
                setPropAndCheckDirty(prop, 1); //any value should do    
            });
        });
    });
};