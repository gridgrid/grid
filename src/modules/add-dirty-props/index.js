module.exports = function(obj, props, dirtyCleans) {
    props.forEach(function(prop) {
        var val;
        var name = prop.name || prop;
        Object.defineProperty(obj, name, {
            enumerable: true,
            get: function() {
                return val;
            },
            set: function(_val) {
                var oldVal = val;
                var isChanged = _val !== oldVal
                if (isChanged && prop.preDirty) {
                    prop.preDirty();
                }
                val = _val;

                if (isChanged) {
                    dirtyCleans.forEach(function(dirtyClean) {
                        dirtyClean.setDirty();
                    });
                    if (prop.onDirty) {
                        prop.onDirty(_val, oldVal);
                    }
                }
            }
        });
    });
    return obj;
};