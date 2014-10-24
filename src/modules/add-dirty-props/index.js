module.exports = function (obj, props, dirtyCleans) {
    props.forEach(function (prop) {
        var val;
        var name = prop.name || prop;
        Object.defineProperty(obj, name, {
            enumerable: true,
            get: function () {
                return val;
            }, set: function (_val) {
                if (_val !== val) {
                    dirtyCleans.forEach(function (dirtyClean) {
                        dirtyClean.setDirty();
                    });
                    if (prop.onDirty) {
                        prop.onDirty();
                    }
                }
                val = _val;
            }
        });
    });
    return obj;
};