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
            expect(obj).not.toBeDirty();
            if (parent) {
                expect(parent).not.toBeDirty();
            }
            obj[prop] = val;
            expect(obj).toBeDirty();
            if (parent) {
                expect(parent).toBeDirty();
            }
        }

        it('should get marked dirty on relevant property changes', function () {
            props.forEach(function (prop) {
                setPropAndCheckDirty(prop, 'some really weird value that hopefully no one would use as a default'); //any value should do    
            });
        });
    });
};