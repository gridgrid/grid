"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var isDirtyPropWithPre = function (dirtyProp) {
    return !!dirtyProp.preDirty;
};
var isDirtyPropWithOn = function (dirtyProp) {
    return !!dirtyProp.onDirty;
};
function add(obj, props, dirtyCleans) {
    props.forEach(function (prop) {
        var val;
        var name = prop.name || prop;
        var initialVal = obj[name];
        Object.defineProperty(obj, name, {
            enumerable: true,
            get: function () {
                return val;
            },
            set: function (newVal) {
                var oldVal = val;
                var isChanged = newVal !== oldVal;
                if (isChanged && isDirtyPropWithPre(prop)) {
                    prop.preDirty();
                }
                val = newVal;
                if (isChanged) {
                    dirtyCleans.forEach(function (dirtyClean) {
                        dirtyClean.setDirty();
                    });
                    if (isDirtyPropWithOn(prop)) {
                        prop.onDirty(newVal, oldVal);
                    }
                }
            }
        });
        obj[name] = initialVal;
    });
    return obj;
}
exports.add = add;
exports.default = add;
//# sourceMappingURL=index.js.map