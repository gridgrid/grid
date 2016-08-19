var addDirtyProps = require('../add-dirty-props');
var util = require('../util');
var noop = require('../no-op');
var passThrough = require('../pass-through');
var debounce = require('../debounce');

module.exports = function (_grid, name, lengthName, defaultSize) {
    var grid = _grid;

    var descriptors = [];
    var numFixed = 0;
    var numHeaders = 0;
    var makeDirtyClean = require('../dirty-clean');
    var dirtyClean = makeDirtyClean(grid);
    var builderDirtyClean = makeDirtyClean(grid);
    var selected = [];

    function setDescriptorsDirty(eventOptional) {
        var event = eventOptional || {};
        event.type = 'grid-' + name + '-change';
        grid.eventLoop.fire(event);
        dirtyClean.setDirty();
        builderDirtyClean.setDirty();
    }

    var fireSelectionChange = debounce(function () {
        grid.eventLoop.fire('grid-' + name + '-selection-change');
    }, 1);

    function updateDescriptorIndices() {
        var oldSelected = selected;
        selected = [];
        descriptors.forEach(function (descriptor, i) {
            descriptor.index = i;
            if (descriptor.selected) {
                selected.push(i);
            }
        });
        if (selected.length !== oldSelected.length) {
            fireSelectionChange();
            return;
        }
        selected.sort();
        oldSelected.sort();
        var change = oldSelected.some(function (idx, i) {
            return idx !== selected[i];
        });
        if (change) {
            fireSelectionChange();
        }
    }

    function addDragReadyClass(descriptor, index) {
        if (!descriptor || !(index >= 0)) {
            return;
        }
        var top = name === 'row' ? index : -1;
        var left = name === 'row' ? -1 : index;
        var dragReadyClass = grid.cellClasses.create(top, left, 'grid-col-drag-ready');
        grid.cellClasses.add(dragReadyClass);
        descriptor.dragReadyClass = dragReadyClass;
    }

    function removeDragReadyClass(descriptor) {
        if (!descriptor || !descriptor.dragReadyClass) {
            return;
        }
        grid.cellClasses.remove(descriptor.dragReadyClass);
        descriptor.dragReadyClass = undefined;
    }

    var api = {
        areBuildersDirty: builderDirtyClean.isDirty,
        isDirty: dirtyClean.isDirty,
        defaultSize: defaultSize,
        add: function (toAdd) {
            if (!toAdd) {
                return;
            }

            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (descriptor) {
                if (descriptor.header) {
                    descriptors.splice(numHeaders, 0, descriptor);
                    numFixed++;
                    numHeaders++;
                } else {
                    // if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
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
            updateDescriptorIndices();
            setDescriptorsDirty({
                action: 'add',
                descriptors: toAdd
            });
        },
        addHeaders: function (toAdd) {
            if (!toAdd) {
                return;
            }

            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (header) {
                header.header = true;
            });
            api.add(toAdd);
        },
        header: function (index) {
            return descriptors[index];
        },
        get: function (index) {
            return descriptors[index];
        },
        length: function (includeHeaders) {
            var subtract = includeHeaders ? 0 : numHeaders;
            return descriptors.length - subtract;
        },
        remove: function (descriptor, dontUpdateIndex) {
            var index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                if (descriptor.header) {
                    numFixed--;
                    numHeaders--;
                } else if (descriptor.fixed) {
                    numFixed--;
                }
            }
            if (!dontUpdateIndex) {
                updateDescriptorIndices();
                setDescriptorsDirty({
                    action: 'remove',
                    descriptors: [descriptor]
                });
            }
        },
        clear: function (includeHeaders) {
            var removed;
            if (includeHeaders) {
                removed = descriptors;
                descriptors = [];
                numFixed = 0;
                numHeaders = 0;
            } else {
                removed = descriptors.slice(numHeaders);
                descriptors = descriptors.slice(0, numHeaders);
                numFixed = numHeaders;
            }
            updateDescriptorIndices();
            if (removed && removed.length) {
                setDescriptorsDirty({
                    action: 'remove',
                    descriptors: removed
                });
            }
        },
        move: function (fromIndexes, target, after) {
            if (!util.isArray(fromIndexes)) {
                fromIndexes = [fromIndexes];
            }

            if (fromIndexes.length === 1) {
                // the single move case is easier and doesn't require the after hint
                var from = fromIndexes[0];
                descriptors.splice(target, 0, descriptors.splice(from, 1)[0]);
                setDescriptorsDirty({
                    action: 'move',
                    descriptors: [api.get(from), api.get(target)]
                });
            } else {
                while (fromIndexes.indexOf(target) !== -1 && target !== -1) {
                    target--;
                    after = true;
                }

                var toValue = descriptors[target];
                var removed = fromIndexes.sort(function compareNumbers(a, b) {
                    return b - a;
                }).map(function (fromIndex) {
                    var removedDescriptors = descriptors.splice(fromIndex, 1);
                    return removedDescriptors[0];

                });
                removed.reverse();
                var spliceArgs = [descriptors.indexOf(toValue) + (after ? 1 : 0), 0].concat(removed);
                descriptors.splice.apply(descriptors, spliceArgs);
                updateDescriptorIndices();
                setDescriptorsDirty({
                    action: 'move',
                    descriptors: removed.concat(toValue)
                });
            }
        },
        numHeaders: function () {
            return numHeaders;
        },
        numFixed: function (excludeHeaders) {
            return numFixed - (excludeHeaders ? numHeaders : 0);
        },
        toVirtual: function (dataIndex) {
            return dataIndex + api.numHeaders();
        },
        toData: function (virtualIndex) {
            return virtualIndex - api.numHeaders();
        },

        select: function (indexes, dontFire) {
            if (!util.isArray(indexes)) {
                indexes = [indexes];
            }
            var changes = indexes.filter(function (idx) {
                var hasDescriptor = !!api[name](idx);
                if (!hasDescriptor) {
                    console.warn('Tried to select index that had no descriptor', idx);
                }
                return hasDescriptor;
            }).map(function (idx) {
                var descriptor = api[name](idx);
                if (!descriptor.selected && descriptor.selectable !== false) {
                    addDragReadyClass(descriptor, idx);
                    descriptor.selected = true;
                    selected.push(idx);
                    return idx;
                }
            });
            if (changes.length && !dontFire) {
                fireSelectionChange();
            }
        },
        deselect: function (indexes, dontFire) {
            if (!util.isArray(indexes)) {
                indexes = [indexes];
            }
            var selectedMap = selected.reduce(function (map, selectedIndex) {
                map[selectedIndex] = selectedIndex;
                return map;
            }, {});
            var changes = indexes.filter(function (idx) {
                var hasDescriptor = !!api[name](idx);
                if (!hasDescriptor) {
                    console.warn('Tried to deselect index that had no descriptor', idx);
                }
                return hasDescriptor;
            }).map(function (idx) {
                var descriptor = api[name](idx);
                removeDragReadyClass(descriptor);
                if (descriptor.selected) {
                    descriptor.selected = false;
                    selectedMap[idx] = false;
                    return idx;
                }
            });
            selected = Object.keys(selectedMap)
                .reduce(function (array, selectedKey) {
                    var idx = selectedMap[selectedKey];
                    if (idx !== false) {
                        array.push(idx)
                    }
                    return array;
                }, []);

            if (changes.length && !dontFire) {
                fireSelectionChange();
            }
        },
        toggleSelect: function (index) {
            var descriptor = api[name](index);
            if (descriptor.selected) {
                api.deselect(index);
            } else {
                api.select(index);
            }
        },
        clearSelected: function () {
            // have to make a copy or we are iterating the same array we're removing from yikes.
            return api.deselect(api.getSelected().slice(0));
        },
        getSelected: function () {
            return selected;
        },
        allSelected: function () {
            return api.getSelected().length === api.length();
        },
        create: function (builder) {
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
            var expanded = false;
            var expandedClass;

            Object.defineProperty(descriptor, 'expanded', {
                get: function () {
                    return expanded;
                },
                set: function (exp) {
                    if (!descriptor.children) {
                        return;
                    }
                    expanded = exp;
                    // we never look for changes to the children, if you need to change it, remove and add the row again
                    if (expanded) {
                        var spliceArgs = [descriptor.index + 1, 0].concat(descriptor.children)
                        descriptors.splice.apply(descriptors, spliceArgs);
                        updateDescriptorIndices();
                        setDescriptorsDirty({
                            action: 'add',
                            descriptors: descriptor.children
                        });
                        var top = name === 'row' ? descriptor.index : 0;
                        var left = name === 'col' ? descriptor.index : 0;
                        var height = name === 'row' ? 1 : Infinity;
                        var width = name === 'col' ? 1 : Infinity;
                        expandedClass = grid.cellClasses.create(top, left, 'grid-expanded', height, width, 'virtual');
                        grid.cellClasses.add(expandedClass);

                    } else {
                        descriptors.splice(descriptor.index + 1, descriptor.children.length);
                        updateDescriptorIndices();
                        setDescriptorsDirty({
                            action: 'remove',
                            descriptors: [descriptor.children]
                        });
                        if (expandedClass) {
                            grid.cellClasses.remove(expandedClass);
                        }
                    }
                }
            });

            descriptor.isBuiltActionable = true;

            addDirtyProps(descriptor, ['builder'], [builderDirtyClean]);
            descriptor.builder = builder;

            return addDirtyProps(descriptor, [{
                name: lengthName,
                onDirty: function () {
                    setDescriptorsDirty({
                        action: 'size',
                        descriptors: [descriptor]
                    });
                }
            }, {
                name: 'hidden',
                onDirty: function () {
                    setDescriptorsDirty({
                        action: 'hide',
                        descriptors: [descriptor]
                    });
                }
            }], [dirtyClean]);
        },
        createBuilder: function (render, update) {
            return {
                render: render || noop,
                update: update || passThrough
            };
        }

    };

    // basically height or width
    api[lengthName] = function (index) {
        var descriptor = descriptors[index];
        if (!descriptor) {
            return NaN;
        }


        if (descriptor.hidden) {
            return 0;
        }

        return descriptor[lengthName] || api.defaultSize;
    };

    // row or col get
    api[name] = function (index) {
        return descriptors[index + numHeaders];
    };

    return api;
};
