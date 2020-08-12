"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_clean_1 = require("../dirty-clean");
var dirty_props_1 = require("../dirty-props");
var position_range_1 = require("../position-range");
function create(grid) {
    var dirtyClean = dirty_clean_1.default(grid);
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
            var thisDirtyClean = dirty_clean_1.default(grid);
            var descriptor = position_range_1.default({
                _cellClassDirtyClean: thisDirtyClean
            }, thisDirtyClean, dirtyClean, {
                preDirty: classPreDirty,
                onDirty: classOnDirty
            });
            function classPreDirty() {
                if (descriptor) {
                    addOrRemoveCachedClass(descriptor, true);
                }
            }
            function classOnDirty() {
                if (descriptor) {
                    addOrRemoveCachedClass(descriptor);
                }
            }
            dirty_props_1.default(descriptor, [{
                    name: 'class',
                    preDirty: classPreDirty,
                    onDirty: classOnDirty
                }], [thisDirtyClean, dirtyClean]);
            descriptor.space = space || descriptor.space;
            descriptor.top = top;
            descriptor.left = left;
            descriptor.height = height || 1;
            descriptor.width = width || 1;
            descriptor.class = className;
            return descriptor;
        },
        isDirty: dirtyClean.isDirty
    };
    function regnerateCache() {
        cachedClassMatrix = [];
        api.getAll().forEach(function (descriptor) {
            addOrRemoveCachedClass(descriptor);
        });
    }
    grid.eventLoop.bind('grid-row-change', regnerateCache);
    grid.eventLoop.bind('grid-col-change', regnerateCache);
    function addOrRemoveCachedClass(descriptor, isRemove) {
        var top = descriptor.top, left = descriptor.left, height = descriptor.height, width = descriptor.width, space = descriptor.space;
        var className = descriptor.class;
        if (top === undefined || height === undefined || left === undefined || width === undefined || className === undefined) {
            return;
        }
        for (var r = top; r < Math.min(top + height, grid.rowModel.length(true)); r++) {
            for (var c = left; c < Math.min(left + width, grid.colModel.length(true)); c++) {
                var spaceKey = position_range_1.toStandardSpace(space);
                var vRow = grid[spaceKey].row.toVirtual(r);
                var vCol = grid[spaceKey].col.toVirtual(c);
                var cols = cachedClassMatrix[vRow];
                if (!cols) {
                    cols = cachedClassMatrix[vRow] = [];
                }
                var cellClasses = cols[vCol];
                if (!cellClasses) {
                    if (!isRemove) {
                        cols[vCol] = [className];
                    }
                    continue;
                }
                if (!isRemove) {
                    if (cellClasses.indexOf(className) === -1) {
                        cellClasses.push(className);
                    }
                }
                else {
                    var index = cellClasses.indexOf(className);
                    if (index !== -1) {
                        cellClasses.splice(index, 1);
                    }
                }
            }
        }
    }
    return api;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map