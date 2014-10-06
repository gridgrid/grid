module.exports = function (obj, props, dirtyCleans) {
    props.forEach(function (prop) {
        var val;
        Object.defineProperty(obj, prop, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                if (_val !== val) {
                    dirtyCleans.forEach(function (dirtyClean) {
                        dirtyClean.setDirty();
                    });
                }
                val = _val;
            }
        });
    });
    return obj;
};