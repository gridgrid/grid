var positionRange = require('../position-range');
var makeDirtyClean = require('../dirty-clean');
var addDirtyProps = require('../add-dirty-props');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);
    var descriptors = [];
    var cachedClassMatrix = [];

    var api = {
        add: function (descriptor) {
            descriptors.push(descriptor);
            addOrRemoveCachedClass(descriptor);
            if (descriptor._cellClassDirtyClean) {
                descriptor._cellClassDirtyClean.enable();
            }
            dirtyClean.setDirty();
        },
        remove: function (descriptor) {
            var index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                addOrRemoveCachedClass(descriptor, true);
                if (descriptor._cellClassDirtyClean) {
                    descriptor._cellClassDirtyClean.disable();
                }
                dirtyClean.setDirty();
            }
        },
        getAll: function () {
            return descriptors.slice(0);
        },
        getCachedClasses: function (vRow, vCol) {
            return cachedClassMatrix[vRow] && cachedClassMatrix[vRow][vCol] || [];
        },
        create: function (top, left, className, height, width, space) {
            var thisDirtyClean = makeDirtyClean(grid);
            var descriptor = {
                _cellClassDirtyClean: thisDirtyClean
            };
            // mixins

            function classPreDirty() {
                addOrRemoveCachedClass(descriptor, true);
            }

            function classOnDirty() {
                addOrRemoveCachedClass(descriptor);
            }

            positionRange(descriptor, thisDirtyClean, dirtyClean, {
                preDirty: classPreDirty,
                onDirty: classOnDirty
            });
            addDirtyProps(descriptor, [{
                name: 'class',
                preDirty: classPreDirty,
                onDirty: classOnDirty
            }], [thisDirtyClean, dirtyClean]);

            // all of these are optional
            descriptor.top = top;
            descriptor.left = left;
            // default to single cell ranges
            descriptor.height = height || 1;
            descriptor.width = width || 1;
            descriptor.class = className;
            descriptor.space = space || descriptor.space;
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };

    function regnerateCache() {
        cachedClassMatrix = [];
        api.getAll().forEach(function (descriptor) {
            addOrRemoveCachedClass(descriptor);
        })
    }

    grid.eventLoop.bind('grid-row-change', regnerateCache);
    grid.eventLoop.bind('grid-col-change', regnerateCache);

    function addOrRemoveCachedClass(descriptor, isRemove) {
        for (var r = descriptor.top; r < Math.min(descriptor.top + descriptor.height, grid.rowModel.length(true)); r++) {
            for (var c = descriptor.left; c < Math.min(descriptor.left + descriptor.width, grid.colModel.length(true)); c++) {
                var vRow = grid[descriptor.space].row.toVirtual(r);
                var vCol = grid[descriptor.space].col.toVirtual(c);
                var cols = cachedClassMatrix[vRow];
                if (!cols) {
                    cols = cachedClassMatrix[vRow] = [];
                }
                var cellClasses = cols[vCol];
                if (!cellClasses) {
                    if (!isRemove) {
                        cols[vCol] = [descriptor.class];
                    }
                    continue;
                }

                if (!isRemove) {
                    if (cellClasses.indexOf(descriptor.class) === -1) {
                        cellClasses.push(descriptor.class);
                    }
                } else {
                    var index = cellClasses.indexOf(descriptor.class);
                    if (index !== -1) {
                        cellClasses.splice(index, 1);
                    }
                }
            }
        }
    }


    return api;
};
