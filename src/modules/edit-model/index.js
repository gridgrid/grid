var key = require('key');

module.exports = function(grid) {
    var editModel = {
        editing: false,
        _defaultDecorator: grid.decorators.create(-1, -1, 1, 1)
    };
    editModel._defaultDecorator.render = function() {
        var element = document.createElement('textarea');
        element.style.pointerEvents = 'all';
        element.style.zIndex = 1;
        element.style.position = 'relative';
        grid.eventLoop.bindOnce('grid-draw', function() {
            if (editModel._defaultDecorator.isTyping) {
                element.value = grid.textarea.value;
            }
            element.focus();
        });
        return element;
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
        } else if (!opts.getEditor) {
            opts.getEditor = function() {
                return {};
            };
        }

        opts.headers = !!opts.headers; // be explicit, and default to false
        return opts;
    };

    function optsHasTrigger(opts, trigger) {
        return opts && opts.editTriggers && opts.editTriggers.indexOf(trigger) !== -1;
    }

    function getOptsForCol(col) {
        var colDescriptor = grid.data.col.get(col);
        if (!colDescriptor) {
            return;
        }
        return editModel._hydrateOpts(colDescriptor.editOptions);
    }

    editModel._interceptor = function(e) {
        var col = e.col;
        var row = e.row;
        var opts = getOptsForCol(col);
        if (!opts) {
            return;
        }
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
                        editModel.editCell(row, col, true);
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

    editModel.editCell = function(r, c, isTyping) {
        var opts = getOptsForCol(c);
        if (!opts) {
            return;
        }
        editModel.editing = true;
        var editor = opts.getEditor();
        if (editor.decorator === undefined) {
            editor.decorator = editModel._defaultDecorator;
            if (editor.save === undefined) {
                editor.save = function() {

                };
            }
        }
        editModel.currentEditor = editor;
        if (editor.decorator) {
            editor.decorator.isTyping = !!isTyping;
            editor.decorator.top = r;
            editor.decorator.left = c;
            grid.decorators.add(editor.decorator);
        }
    };

    grid.eventLoop.addInterceptor(editModel._interceptor);

    return editModel;
};
