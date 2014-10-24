module.exports = function (context) {
    var helper;
    var obj;
    var props;
    var dirtyObjs;
    beforeEach(function () {
        helper = context.helper;
        obj = context.obj;
        dirtyObjs = context.dirtyObjs;
        props = context.props;
    });

    describe('add-dirty-props', function () {
        function setPropAndCheckDirty(prop, val) {
            helper.resetAllDirties();
            dirtyObjs.forEach(function (dirtyObj) {
                expect(dirtyObj).not.toBeDirty();
            });
            obj[prop.name || prop] = val;
            dirtyObjs.forEach(function (dirtyObj) {
                expect(dirtyObj).toBeDirty();
            });
        }

        it('should get marked dirty on relevant property changes', function () {
            props.forEach(function (prop) {
                setPropAndCheckDirty(prop, 'some really weird value that hopefully no one would use as a default'); //any value should do    
            });
        });
    });
};