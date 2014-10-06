module.exports = function (range, dirtyClean, parentDirtyClean) {
    range = range || {}; //allow mixin functionality
    range.isDirty = dirtyClean.isDirty;

    var watchedProperties = ['top', 'left', 'height', 'width', 'units', 'space'];
    watchedProperties.forEach(function (prop) {
        var val;
        Object.defineProperty(range, prop, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                if (_val !== val) {
                    dirtyClean.setDirty();
                    if (parentDirtyClean) {
                        parentDirtyClean.setDirty();
                    }
                }
                val = _val;
            }
        });
    });
    //defaults
    range.units = 'cell';
    range.space = 'virtual';

    return range;
};