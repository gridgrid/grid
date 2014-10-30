var addDirtyProps = require('@grid/add-dirty-props');
var util = require('@grid/util');

module.exports = function (_grid, name, lengthName, defaultLength) {
    var grid = _grid;

    var DEFAULT_LENGTH = defaultLength;
    var descriptors = [];
    var numFixed = 0;
    var numHeaders = 0;
    var dirtyClean = require('@grid/dirty-clean')(grid);

    function setDescriptorsDirty() {
        grid.eventLoop.fire('grid-' + name + '-change');
        dirtyClean.setDirty();
    }

    var api = {
        isDirty: dirtyClean.isDirty,
        add: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (descriptor) {
                if (descriptor.header) {
                    descriptors.splice(numHeaders, 0, descriptor);
                    numFixed++;
                    numHeaders++;
                }

                else {
                    //if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
                    if (descriptor.fixed) {
                        if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
                            numFixed++;
                        } else {
                            throw 'Cannot add a fixed column after an unfixed one';
                        }
                    }
                    descriptors.push(descriptor);
                }
            });

            setDescriptorsDirty();
        },
        addHeaders: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (header) {
                header.header = true;
            });
            api.add(toAdd);
        },
        getHeader: function (index) {
            return descriptors[index];
        },
        get: function (index) {
            return descriptors[index];
        },
        length: function () {
            return descriptors.length;
        },
        move: function (start, target) {
            descriptors.splice(target, 0, descriptors.splice(start, 1)[0]);
            setDescriptorsDirty();
        },
        numHeaders: function () {
            return numHeaders;
        },
        numFixed: function () {
            return numFixed;
        },
        create: function () {
            var descriptor = {};
            var fixed = false;
            Object.defineProperty(descriptor, 'fixed', {
                enumerable: true,
                get: function () {
                    return descriptor.header || fixed;
                },
                set: function (_fixed) {
                    fixed = _fixed;
                }
            });
            return addDirtyProps(descriptor, [
                {
                    name: lengthName,
                    onDirty: function () {
                        grid.eventLoop.fire('grid-' + name + '-change');
                    }
                }
            ], [dirtyClean]);
        }
    };

    //basically height or width
    api[lengthName] = function (index) {
        if (!descriptors[index]) {
            return NaN;
        }

        return descriptors[index] && descriptors[index][lengthName] || DEFAULT_LENGTH;
    };

    return api;
};