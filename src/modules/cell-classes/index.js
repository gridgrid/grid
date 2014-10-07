var positionRange = require('@grid/position-range');
var makeDirtyClean = require('@grid/dirty-clean');
var addDirtyProps = require('@grid/add-dirty-props');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);
    var descriptors = [];

    var api = {
        add: function (descriptor) {
            descriptors.push(descriptor);
            dirtyClean.setDirty();
        },
        remove: function (descriptor) {
            descriptors.splice(descriptors.indexOf(descriptor), 1);
            dirtyClean.setDirty();
        },
        getAll: function () {
            return descriptors.slice(0);
        },
        create: function (top, left, className, height, width) {
            var thisDirtyClean = makeDirtyClean(grid);
            var descriptor = {};
            //mixins
            positionRange(descriptor, thisDirtyClean, dirtyClean);
            addDirtyProps(descriptor, ['class'], [thisDirtyClean, dirtyClean]);

            //all of these are optional
            descriptor.top = top;
            descriptor.left = left;
            //default to single cell ranges
            descriptor.height = height || 1;
            descriptor.width = width || 1;
            descriptor.class = className;
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };


    return api;
};