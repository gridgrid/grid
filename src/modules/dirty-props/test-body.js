module.exports = function (context) {
    var obj;
    var props;
    var dirtyObjs;
    beforeEach(function () {
        obj = context.obj;
        dirtyObjs = context.dirtyObjs;
        props = context.props;
    });

    describe('dirty-props.add', function () {
        function setPropAndCheckDirty(prop, val) {
            this.resetAllDirties();
            dirtyObjs.forEach(function (dirtyObj) {
                expect(dirtyObj).not.toBeDirty();
            });
            obj[prop.name || prop] = val;
            dirtyObjs.forEach(function (dirtyObj) {
                expect(dirtyObj).toBeDirty();
            });
        }

        it('should get marked dirty on relevant property changes', function () {
            var self = this;
            props.forEach(function (prop) {
                setPropAndCheckDirty.call(self, prop, 'some really weird value that hopefully no one would use as a default'); //any value should do    
            });
        });
    });
};