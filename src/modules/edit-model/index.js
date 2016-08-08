var key = require('key');
var clickOff = require('click-off');

module.exports = function (grid) {
    var editModel = {
        editing: false,
        _defaultDecorator: grid.decorators.create(-1, -1, 1, 1)
    };

    editModel._defaultDecorator.render = function () {
        var element = document.createElement('textarea');
        element.style.pointerEvents = 'all';
        element.style.zIndex = 1;
        element.style.position = 'relative';
        grid.eventLoop.bindOnce('grid-draw', function () {
            element.value = editModel._defaultDecorator.typedText() || grid.dataModel.get(editModel._defaultDecorator.top, editModel._defaultDecorator.left).formatted;
            element.focus();
        });
        editModel._defaultDecorator.renderedElem = element;
        return element;
    };
    editModel._hydrateOpts = function (opts) {
        opts = opts || {
            getEditor: function () {
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
            opts.getEditor = function () {
                return {
                    decorator: false,
                    save: undefined,
                    closePromise: opts.action.apply(opts, arguments)
                };
            };
        } else if (!opts.getEditor) {
            opts.getEditor = function () {
                return {};
            };
        }

        opts.headers = !!opts.headers; // be explicit, and default to false
        return opts;
    };

    function optsHasTrigger(opts, trigger, triggerField) {
        return opts && opts[triggerField] && opts[triggerField].indexOf(trigger) !== -1;
    }

    function optsHasEditTrigger(opts, trigger) {
        return optsHasTrigger(opts, trigger, 'editTriggers');
    }

    function optsHasCancelTrigger(opts, trigger) {
        return optsHasTrigger(opts, trigger, 'cancelTriggers');
    }

    function optsHasSaveTrigger(opts, trigger) {
        return optsHasTrigger(opts, trigger, 'saveTriggers');
    }

    function getOptsForCol(col) {
        var colDescriptor = grid.data.col.get(col);
        if (!colDescriptor) {
            return;
        }
        return editModel._hydrateOpts(colDescriptor.editOptions);
    }

    editModel._interceptor = function (e) {
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
                    if (optsHasEditTrigger(opts, 'click') && grid.eventIsOnCells(e)) {
                        editModel.editCell(row, col, false, e);
                    }
                    break;
                case 'dblclick':
                    if (optsHasEditTrigger(opts, 'dblclick') && grid.eventIsOnCells(e)) {
                        editModel.editCell(row, col, false, e);
                    }
                    break;
                case 'keydown':
                    if (optsHasEditTrigger(opts, 'space') && key.is(key.code.special.space, e.which)) {
                        editModel.editCell(row, col, false, e);
                    }

                    if (optsHasEditTrigger(opts, 'enter') && key.is(key.code.special.enter, e.which)) {
                        editModel.editCell(row, col, false, e);
                    }

                    // delete trigger can also happen only when not editing
                    // also have to hardcode 46 until key library merges change
                    if (key.is(key.code.special.backspace, e.which) || e.which === 46) {
                        editModel.deleteSelection();
                    }
                    break;
                case 'keypress':
                    if (optsHasEditTrigger(opts, 'typing') && e.which >= 32 && e.which <= 122 && !e.metaKey && !e.ctrlKey && !e.altKey) {
                        editModel.editCell(row, col, true, e);
                    }
                    break;
            }
        } else {
            // check save triggers if editing
            switch (e.type) {
                case 'keydown':
                    if (optsHasSaveTrigger(opts, 'tab') && key.is(key.code.special.tab, e.which)) {
                        editModel.saveEdit().then(function () {
                            grid.navigationModel.handleTabEvent(e);
                        });
                        e.preventDefault();
                    }

                    if (optsHasSaveTrigger(opts, 'enter') && key.is(key.code.special.enter, e.which) && !e.shiftKey) {
                        editModel.saveEdit().then(function () {
                            grid.navigationModel.setFocus(grid.data.down(grid.navigationModel.focus.row), grid.navigationModel.focus.col);
                        });
                    }
                    break;
            }
        }
    };

    editModel.deleteSelection = function () {
        var ranges = grid.navigationModel.getAllSelectedRanges();
        var dataChanges = [];
        ranges.forEach(function (range) {
            grid.data.iterate(range, function (r, c) {
                dataChanges.push({
                    row: r,
                    col: c,
                    value: undefined
                });
            });
        });
        grid.dataModel.set(dataChanges);
    };

    function setEditing(editing) {
        var prevEditing = editModel.editing;
        editModel.editing = editing;
        if (prevEditing !== editing) {
            grid.eventLoop.fire('grid-edit');
        }

    }

    editModel.editCell = function (r, c, isTyping, originalEvent) {
        if (editModel.editing) {
            editModel.saveEdit();
        }
        editModel.savePromise = undefined;

        if (isNaN(r) || isNaN(c)) {
            return;
        }
        var opts = getOptsForCol(c);
        if (!opts) {
            return;
        }
        if ((r < 0 || c < 0) && !opts.headers) {
            return;
        }

        var editor = opts.getEditor(r, originalEvent);
        // if they have no editor or not closePromise,
        // it's just a simple action and there's no need to wait on them in edit mode
        if (!editor || (!editor.closePromise && editor.decorator === false)) {
            return;
        }
        setEditing(true);
        if (editor.decorator === undefined) {
            editor.decorator = editModel._defaultDecorator;
            if (editor.save === undefined) {
                editor.save = function () {
                    var text = editor.decorator.renderedElem && editor.decorator.renderedElem.value;
                    return Promise.resolve({
                        value: text,
                        formatted: text
                    });
                };
            }
        }
        editModel.currentEditor = editor;
        if (editor.decorator) {
            editor.decorator.typedText = function () {
                return isTyping ? grid.textarea.value && grid.textarea.value.trim() : '';
            };
            editor.decorator.top = r;
            editor.decorator.left = c;
            grid.decorators.add(editor.decorator);
            editor.removeEscapeStackHandler = grid.escapeStack.add(function () {
                if (optsHasCancelTrigger(opts, 'escape')) {
                    editModel.cancelEdit();
                } else if (optsHasSaveTrigger(opts, 'escape')) {
                    editModel.saveEdit();
                }
            });

            editor.removeClickOffHandler = clickOff.listen(function getClickOffElement() {
                return editor.decorator && editor.decorator.boundingBox;
            }, function onClick(e) {
                if (editor.isInMe && editor.isInMe(e)) {
                    return;
                }
                if (optsHasCancelTrigger(opts, 'clickoff')) {
                    editModel.cancelEdit();
                } else if (optsHasSaveTrigger(opts, 'clickoff')) {
                    editModel.saveEdit();
                }
            }, {});
        }

        if (editor.closePromise) {
            editor.closePromise.then(function resolve() {
                return editModel.saveEdit();
            }, function reject() {
                return editModel.cancelEdit();
            });
        }
    };

    editModel._closeEditor = function () {
        if (!editModel.editing) {
            return;
        }
        setEditing(false);
        if (editModel.currentEditor.removeEscapeStackHandler) {
            editModel.currentEditor.removeEscapeStackHandler();
        }
        if (editModel.currentEditor.removeClickOffHandler) {
            editModel.currentEditor.removeClickOffHandler();
        }
        if (editModel.currentEditor.decorator) {
            grid.decorators.remove(editModel.currentEditor.decorator);
        }

        grid.viewLayer.draw();
        grid.eventLoop.bindOnce('grid-draw', function () {
            grid.container.focus();
        });
    };

    editModel.cancelEdit = function () {
        editModel._closeEditor();
    };

    editModel.saveEdit = function () {
        if (!editModel.savePromise) {
            var savePromise = editModel.currentEditor.save && editModel.currentEditor.save() || Promise.resolve(null);

            editModel.savePromise = savePromise.then(function (dataResult) {
                if (dataResult) {
                    dataResult.row = editModel.currentEditor.decorator.top;
                    dataResult.col = editModel.currentEditor.decorator.left;
                    grid.dataModel.set([dataResult]);
                }
                editModel._closeEditor();
                return dataResult;
            });
        }
        return editModel.savePromise;
    };

    grid.eventLoop.bind('grid-destroy', function () {
        editModel.cancelEdit();
    });

    grid.eventLoop.addInterceptor(editModel._interceptor);

    return editModel;
};
