"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var debounce_1 = require("../debounce");
var dirty_clean_1 = require("../dirty-clean");
var dirty_props_1 = require("../dirty-props");
var pass_through_1 = require("../pass-through");
var util = require("../util");
var AbstractRowColModel = (function () {
    function AbstractRowColModel(grid, name, lengthName, defaultSize) {
        this.descriptors = [];
        this._numFixed = 0;
        this._numHeaders = 0;
        this._selected = [];
        this.grid = grid;
        this.name = name;
        this.dirtyClean = dirty_clean_1.default(grid);
        this.builderDirtyClean = dirty_clean_1.default(grid);
        this.areBuildersDirty = this.builderDirtyClean.isDirty;
        this.isDirty = this.dirtyClean.isDirty;
        this.ROW_COL_EVENT_TYPE = 'grid-' + name + '-change';
        this.defaultSize = defaultSize;
        this.lengthName = lengthName;
        this.fireSelectionChange = debounce_1.default(function () {
            grid.eventLoop.fire('grid-' + name + '-selection-change');
        }, 1);
    }
    AbstractRowColModel.prototype.add = function (_toAdd) {
        var _this = this;
        if (!_toAdd) {
            return;
        }
        var toAdd = util.toArray(_toAdd);
        toAdd.forEach(function (descriptor) {
            if (descriptor.header) {
                _this.descriptors.splice(_this._numHeaders, 0, descriptor);
                _this._numFixed++;
                _this._numHeaders++;
            }
            else {
                if (descriptor.fixed) {
                    if (!_this.descriptors.length || _this.descriptors[_this.descriptors.length - 1].fixed) {
                        _this._numFixed++;
                    }
                    else {
                        throw new Error('Cannot add a fixed column after an unfixed one');
                    }
                }
                _this.descriptors.push(descriptor);
            }
        });
        this.updateDescriptorIndices();
        this.setDescriptorsDirty({
            action: 'add',
            descriptors: toAdd
        });
    };
    AbstractRowColModel.prototype.addHeaders = function (_toAdd) {
        if (!_toAdd) {
            return;
        }
        var toAdd = util.toArray(_toAdd);
        toAdd.forEach(function (headerDescriptor) {
            headerDescriptor.header = true;
        });
        this.add(toAdd);
    };
    AbstractRowColModel.prototype.header = function (index) {
        return this.descriptors[index];
    };
    AbstractRowColModel.prototype.get = function (index, dataSpace) {
        if (dataSpace) {
            index += this._numHeaders;
        }
        return this.descriptors[index];
    };
    AbstractRowColModel.prototype.length = function (includeHeaders) {
        var subtract = includeHeaders ? 0 : this._numHeaders;
        return this.descriptors.length - subtract;
    };
    AbstractRowColModel.prototype.remove = function (descriptor, dontUpdateIndex) {
        var index = this.descriptors.indexOf(descriptor);
        if (index !== -1) {
            this.descriptors.splice(index, 1);
            if (descriptor.header) {
                this._numFixed--;
                this._numHeaders--;
            }
            else if (descriptor.fixed) {
                this._numFixed--;
            }
        }
        if (!dontUpdateIndex) {
            this.updateDescriptorIndices();
            this.setDescriptorsDirty({
                action: 'remove',
                descriptors: [descriptor]
            });
        }
    };
    AbstractRowColModel.prototype.clear = function (includeHeaders) {
        var removed;
        if (includeHeaders) {
            removed = this.descriptors;
            this.descriptors = [];
            this._numFixed = 0;
            this._numHeaders = 0;
        }
        else {
            removed = this.descriptors.slice(this._numHeaders);
            this.descriptors = this.descriptors.slice(0, this._numHeaders);
            this._numFixed = this._numHeaders;
        }
        this.updateDescriptorIndices();
        if (removed && removed.length) {
            this.setDescriptorsDirty({
                action: 'remove',
                descriptors: removed
            });
        }
    };
    AbstractRowColModel.prototype.move = function (_fromIndexes, target, after) {
        var _a;
        var _this = this;
        var fromIndexes = util.toArray(_fromIndexes);
        if (fromIndexes.length === 1) {
            var from = fromIndexes[0];
            this.descriptors.splice(target, 0, this.descriptors.splice(from, 1)[0]);
            this.setDescriptorsDirty({
                action: 'move',
                descriptors: [this.get(from), this.get(target)]
            });
        }
        else {
            while (fromIndexes.indexOf(target) !== -1 && target !== -1) {
                target--;
                after = true;
            }
            var toValue = this.descriptors[target];
            var removed = fromIndexes
                .sort(function (a, b) { return b - a; })
                .map(function (fromIndex) {
                var removedDescriptors = _this.descriptors.splice(fromIndex, 1);
                return removedDescriptors[0];
            });
            removed.reverse();
            (_a = this.descriptors).splice.apply(_a, __spreadArrays([this.descriptors.indexOf(toValue) + (after ? 1 : 0), 0], removed));
            this.updateDescriptorIndices();
            this.setDescriptorsDirty({
                action: 'move',
                descriptors: removed.concat(toValue)
            });
        }
    };
    AbstractRowColModel.prototype.numHeaders = function () {
        return this._numHeaders;
    };
    AbstractRowColModel.prototype.numFixed = function (excludeHeaders) {
        return this._numFixed - (excludeHeaders ? this._numHeaders : 0);
    };
    AbstractRowColModel.prototype.toVirtual = function (dataIndex) {
        return dataIndex + this.numHeaders();
    };
    AbstractRowColModel.prototype.toData = function (virtualIndex) {
        return virtualIndex - this.numHeaders();
    };
    AbstractRowColModel.prototype.select = function (_indexes, dontFire) {
        var _this = this;
        var indexes = util.toArray(_indexes);
        var changes = indexes
            .filter(function (idx) {
            var hasDescriptor = !!_this.get(idx, true);
            if (!hasDescriptor) {
                console.warn('Tried to select index that had no descriptor', idx);
            }
            return hasDescriptor;
        })
            .map(function (idx) {
            var descriptor = _this.get(idx, true);
            if (!descriptor.selected && descriptor.selectable !== false) {
                _this.addDragReadyClass(descriptor, idx);
                descriptor.selected = true;
                _this._selected.push(idx);
                return idx;
            }
            return undefined;
        })
            .filter(function (c) { return c != undefined; });
        if (changes.length && !dontFire) {
            this.fireSelectionChange();
        }
    };
    AbstractRowColModel.prototype.deselect = function (_indexes, dontFire) {
        var _this = this;
        var indexes = util.toArray(_indexes);
        var selectedMap = this._selected.reduce(function (map, selectedIndex) {
            map[selectedIndex] = selectedIndex;
            return map;
        }, {});
        var changes = indexes
            .filter(function (idx) {
            var hasDescriptor = !!_this.get(idx, true);
            if (!hasDescriptor) {
                console.warn('Tried to deselect index that had no descriptor', idx);
            }
            return hasDescriptor;
        })
            .map(function (idx) {
            var descriptor = _this.get(idx, true);
            _this.removeDragReadyClass(descriptor);
            if (descriptor.selected) {
                descriptor.selected = false;
                selectedMap[idx] = false;
                return idx;
            }
            return undefined;
        })
            .filter(function (c) { return c != undefined; });
        this._selected =
            Object.keys(selectedMap)
                .reduce(function (array, selectedKey) {
                var idx = selectedMap[selectedKey];
                if (idx !== false) {
                    array.push(idx);
                }
                return array;
            }, []);
        if (changes.length && !dontFire) {
            this.fireSelectionChange();
        }
    };
    AbstractRowColModel.prototype.toggleSelect = function (index) {
        var descriptor = this.get(index, true);
        if (descriptor.selected) {
            this.deselect(index);
        }
        else {
            this.select(index);
        }
    };
    AbstractRowColModel.prototype.clearSelected = function () {
        return this.deselect(this.getSelected().slice(0));
    };
    AbstractRowColModel.prototype.getSelected = function () {
        return this._selected;
    };
    AbstractRowColModel.prototype.allSelected = function () {
        return this.getSelected().length === this.length();
    };
    AbstractRowColModel.prototype.create = function (builder) {
        var _this = this;
        var fixed = false;
        var expanded = false;
        var expandedClass;
        var setExpanded = function (exp) {
            var _a;
            if (!descriptor.children || descriptor.index == undefined) {
                return;
            }
            expanded = exp;
            if (expanded) {
                (_a = _this.descriptors).splice.apply(_a, __spreadArrays([descriptor.index + 1, 0], descriptor.children));
                _this.updateDescriptorIndices();
                _this.setDescriptorsDirty({
                    action: 'add',
                    descriptors: descriptor.children
                });
                var top_1 = _this.name === 'row' ? descriptor.index : 0;
                var left = _this.name === 'col' ? descriptor.index : 0;
                var height = _this.name === 'row' ? 1 : Infinity;
                var width = _this.name === 'col' ? 1 : Infinity;
                expandedClass = _this.grid.cellClasses.create(top_1, left, 'grid-expanded', height, width, 'virtual');
                _this.grid.cellClasses.add(expandedClass);
            }
            else {
                _this.descriptors.splice(descriptor.index + 1, descriptor.children.length);
                _this.updateDescriptorIndices();
                _this.setDescriptorsDirty({
                    action: 'remove',
                    descriptors: __spreadArrays(descriptor.children)
                });
                if (expandedClass) {
                    _this.grid.cellClasses.remove(expandedClass);
                }
            }
        };
        var descriptor = {
            isBuiltActionable: true,
            get fixed() {
                return descriptor.header || !!fixed;
            },
            set fixed(_fixed) {
                fixed = _fixed;
            },
            get expanded() {
                return expanded;
            },
            set expanded(exp) {
                setExpanded(exp);
            }
        };
        dirty_props_1.default(descriptor, ['builder'], [this.builderDirtyClean]);
        dirty_props_1.default(descriptor, [{
                name: 'data', onDirty: function () {
                    _this.grid.dataModel.setDirty();
                }
            }], []);
        descriptor.builder = builder;
        return dirty_props_1.default(descriptor, [{
                name: this.lengthName,
                onDirty: function () {
                    _this.setDescriptorsDirty({
                        action: 'size',
                        descriptors: [descriptor]
                    });
                }
            }, {
                name: 'hidden',
                onDirty: function () {
                    _this.setDescriptorsDirty({
                        action: 'hide',
                        descriptors: [descriptor]
                    });
                }
            }], [this.dirtyClean]);
    };
    AbstractRowColModel.prototype.createBuilder = function (render, update, includeHeaders) {
        if (update === void 0) { update = pass_through_1.default; }
        if (includeHeaders === void 0) { includeHeaders = false; }
        return {
            render: render,
            update: update,
            includeHeaders: includeHeaders
        };
    };
    AbstractRowColModel.prototype.sizeOf = function (index) {
        var descriptor = this.get(index);
        if (!descriptor) {
            return NaN;
        }
        if (descriptor.hidden) {
            return 0;
        }
        var size = descriptor[this.lengthName];
        return size || this.defaultSize;
    };
    AbstractRowColModel.prototype.setDescriptorsDirty = function (eventBody) {
        var event = Object.assign(eventBody, {
            type: this.ROW_COL_EVENT_TYPE
        });
        this.grid.eventLoop.fire(event);
        this.dirtyClean.setDirty();
        this.builderDirtyClean.setDirty();
    };
    AbstractRowColModel.prototype.updateDescriptorIndices = function () {
        var _this = this;
        var oldSelected = this._selected;
        this._selected = [];
        this.descriptors.forEach(function (descriptor, i) {
            descriptor.index = i;
            if (descriptor.selected) {
                _this._selected.push(i);
            }
        });
        if (this._selected.length !== oldSelected.length) {
            this.fireSelectionChange();
            return;
        }
        this._selected.sort();
        oldSelected.sort();
        var change = oldSelected.some(function (idx, i) {
            return idx !== _this._selected[i];
        });
        if (change) {
            this.fireSelectionChange();
        }
    };
    AbstractRowColModel.prototype.addDragReadyClass = function (descriptor, index) {
        if (!descriptor || !(index >= 0)) {
            return;
        }
        var top = this.name === 'row' ? index : -1;
        var left = this.name === 'row' ? -1 : index;
        var dragReadyClass = this.grid.cellClasses.create(top, left, 'grid-col-drag-ready');
        this.grid.cellClasses.add(dragReadyClass);
        descriptor.dragReadyClass = dragReadyClass;
    };
    AbstractRowColModel.prototype.removeDragReadyClass = function (descriptor) {
        if (!descriptor || !descriptor.dragReadyClass) {
            return;
        }
        this.grid.cellClasses.remove(descriptor.dragReadyClass);
        descriptor.dragReadyClass = undefined;
    };
    AbstractRowColModel.prototype.compactAndSort = function () {
        this.rangeStates = this.rangeStates
            .slice()
            .sort(function (a, b) { return a.start - b.start; })
            .reduce(function (newRangeStates, rs) {
            var last = newRangeStates.pop();
            if (!last) {
                return __spreadArrays(newRangeStates, [rs]);
            }
            if (last.end < rs.start) {
                return __spreadArrays(newRangeStates, [last, rs]);
            }
            if (last.end > rs.end) {
                return __spreadArrays(newRangeStates, [last]);
            }
            return __spreadArrays(newRangeStates, [
                {
                    start: last.start,
                    end: rs.end,
                }
            ]);
        }, []);
    };
    return AbstractRowColModel;
}());
exports.AbstractRowColModel = AbstractRowColModel;
function create(grid, name, lengthName, defaultSize) {
    return new AbstractRowColModel(grid, name, lengthName, defaultSize);
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map