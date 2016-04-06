var key = require('key');

module.exports = function(grid) {
    var editModel = {
        editing: false
    };
    editModel._hydrateOpts = function(opts) {
        opts = opts || {
            getEditor: function() {
                return {};
            }
        };
        // yesyes i know modifying supplied args. hush.
        var isActionMode = !!opts.action;
        if (!opts.editTriggers) {
            if (isActionMode) {
                opts.editTriggers = ['click', 'space', 'enter'];
            } else {
                opts.editTriggers = ['dblclick', 'enter', 'typing'];
            }
        }

        if (!opts.saveTriggers) {
            if (isActionMode) {
                opts.saveTriggers = [];
            } else {
                opts.saveTriggers = ['tab', 'enter', 'clickoff'];
            }
        }

        if (!opts.cancelTriggers) {
            if (isActionMode) {
                opts.cancelTriggers = [];
            } else {
                opts.cancelTriggers = ['escape'];
            }
        }

        if (isActionMode) {
            opts.getEditor = function() {
                return {
                    decorator: false,
                    save: undefined,
                    closePromise: opts.action()
                };
            };
        }

        opts.headers = !!opts.headers; // be explicit, and default to false
        return opts;
    };

    function optsHasTrigger(opts, trigger) {
        return opts && opts.editTriggers && opts.editTriggers.indexOf(trigger) !== -1;
    }

    editModel._interceptor = function(e) {
        var col = e.col;
        var row = e.row;
        var colDescriptor = grid.data.col.get(col);
        if (!colDescriptor) {
            return;
        }

        var opts = editModel._hydrateOpts(colDescriptor.editOptions);
        if (!editModel.editing) {
            // check editTriggers if not editing
            switch (e.type) {
                case 'click':
                    if (optsHasTrigger(opts, 'click')) {
                        editModel.editCell(row, col);
                    }
                    break;
                case 'dblclick':
                    if (optsHasTrigger(opts, 'dblclick')) {
                        editModel.editCell(row, col);
                    }
                    break;
                case 'keydown':
                    if (optsHasTrigger(opts, 'space') && key.is(key.code.special.space, e.which)) {
                        editModel.editCell(row, col);
                    }

                    if (optsHasTrigger(opts, 'enter') && key.is(key.code.special.enter, e.which)) {
                        editModel.editCell(row, col);
                    }

                    // delete trigger can also happen only when not editing
                    // also have to hardcode 46 until key library merges change
                    if (key.is(key.code.special.backspace, e.which) || e.which === 46) {
                        editModel.deleteSelection();
                    }
                    break;
                case 'keypress':
                    if (optsHasTrigger(opts, 'typing') && e.which >= 32 && e.which <= 122) {
                        editModel.editCell(row, col);
                    }
                    break;
            }
        } else {
            // check save and cancel triggers if editing
        }
    };

    editModel.deleteSelection = function() {
        var ranges = grid.navigationModel.getAllSelectedRanges();
        var dataChanges = [];
        ranges.forEach(function(range) {
            grid.data.iterate(range, function(r, c) {
                dataChanges.push({
                    row: r,
                    col: c,
                    value: undefined
                });
            });
        });
        grid.dataModel.set(dataChanges);
    };

    editModel.editCell = function(r, c) {
        editModel.editing = true;
    };


    return editModel;
};
