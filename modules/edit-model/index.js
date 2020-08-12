"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var event_loop_1 = require("../event-loop");
var key = require('key');
var clickOff = require('click-off');
var Trigger;
(function (Trigger) {
    Trigger["Click"] = "click";
    Trigger["Space"] = "space";
    Trigger["Enter"] = "enter";
    Trigger["Dblclick"] = "dblclick";
    Trigger["Typing"] = "typing";
    Trigger["Tab"] = "tab";
    Trigger["Clickoff"] = "clickoff";
    Trigger["Escape"] = "escape";
})(Trigger = exports.Trigger || (exports.Trigger = {}));
function create(grid) {
    var editModel = {
        editing: false,
        _defaultDecorator: grid.decorators.create(-1, -1, 1, 1),
        _hydrateOpts: function (optsCreator) {
            if (optsCreator === void 0) { optsCreator = {}; }
            var isActionMode = !!(optsCreator && optsCreator.action);
            var opts = __assign({ getEditor: function () {
                    return {};
                }, headers: !!optsCreator.headers, editTriggers: isActionMode ?
                    [Trigger.Click, Trigger.Space, Trigger.Enter] :
                    [Trigger.Dblclick, Trigger.Enter, Trigger.Typing], saveTriggers: isActionMode ?
                    [] :
                    [Trigger.Tab, Trigger.Enter, Trigger.Clickoff], cancelTriggers: isActionMode ?
                    [] :
                    [Trigger.Escape] }, optsCreator);
            if (isActionMode) {
                opts.getEditor = function () {
                    return {
                        decorator: false,
                        save: undefined,
                        closePromise: opts.action && opts.action.apply(opts, arguments)
                    };
                };
            }
            else if (!opts.getEditor) {
                opts.getEditor = function () {
                    return {};
                };
            }
            return opts;
        },
        _interceptor: function (e) {
            if (!event_loop_1.isAnnotatedMouseOrKeyEvent(e)) {
                return;
            }
            var col = e.col;
            var row = e.row;
            var opts = getOptsForCol(col);
            if (!opts) {
                return;
            }
            if (!editModel.editing) {
                switch (e.type) {
                    case 'click':
                        if (optsHasEditTrigger(opts, Trigger.Click) && grid.eventIsOnCells(e)) {
                            editModel.editCell(row, col, false, e);
                        }
                        break;
                    case 'dblclick':
                        if (optsHasEditTrigger(opts, Trigger.Dblclick) && grid.eventIsOnCells(e)) {
                            editModel.editCell(row, col, false, e);
                        }
                        break;
                    case 'keydown':
                        if (optsHasEditTrigger(opts, Trigger.Space) && key.is(key.code.special.space, e.which)) {
                            editModel.editCell(row, col, false, e);
                        }
                        if (optsHasEditTrigger(opts, Trigger.Enter) && key.is(key.code.special.enter, e.which)) {
                            editModel.editCell(row, col, false, e);
                        }
                        if (key.is(key.code.special.backspace, e.which) || e.which === 46) {
                            editModel.deleteSelection();
                        }
                        break;
                    case 'keypress':
                        if (optsHasEditTrigger(opts, Trigger.Typing) &&
                            e.which >= 32 && e.which <= 122 && !e.metaKey && !e.ctrlKey && !e.altKey) {
                            editModel.editCell(row, col, true, e);
                        }
                        break;
                }
            }
            else {
                switch (e.type) {
                    case 'keydown':
                        if (optsHasSaveTrigger(opts, Trigger.Tab) && key.is(key.code.special.tab, e.which)) {
                            editModel.saveEdit().then(function () {
                                grid.navigationModel.handleTabEvent(e);
                            });
                            e.preventDefault();
                        }
                        if (optsHasSaveTrigger(opts, Trigger.Enter) && key.is(key.code.special.enter, e.which) && !e.shiftKey) {
                            editModel.saveEdit().then(function () {
                                grid.navigationModel.setFocus(grid.data.down(grid.navigationModel.focus.row), grid.navigationModel.focus.col);
                            });
                        }
                        break;
                }
            }
        },
        deleteSelection: function () {
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
        },
        editCell: function (r, c, isTyping, originalEvent) {
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
            if (!editor || (!editor.closePromise && editor.decorator === false)) {
                return;
            }
            setEditing(true);
            if (editor.decorator === undefined) {
                editor.decorator = editModel._defaultDecorator;
                if (editor.save === undefined) {
                    editor.save = function () {
                        var text = editModel._defaultDecorator.renderedElem && editModel._defaultDecorator.renderedElem.value;
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
                    if (optsHasCancelTrigger(opts, Trigger.Escape)) {
                        editModel.cancelEdit();
                    }
                    else if (optsHasSaveTrigger(opts, Trigger.Escape)) {
                        editModel.saveEdit();
                    }
                });
                editor.removeClickOffHandler = clickOff.listen(function getClickOffElement() {
                    return editor.decorator && editor.decorator.boundingBox;
                }, function (e) {
                    if (editor.isInMe && editor.isInMe(e)) {
                        return;
                    }
                    if (optsHasCancelTrigger(opts, Trigger.Clickoff)) {
                        editModel.cancelEdit();
                    }
                    else if (optsHasSaveTrigger(opts, Trigger.Clickoff)) {
                        editModel.saveEdit();
                    }
                }, {});
            }
            if (editor.closePromise) {
                editor.closePromise.then(function resolved() {
                    return editModel.saveEdit();
                }, function rejected() {
                    return editModel.cancelEdit();
                });
            }
        },
        _closeEditor: function () {
            if (!editModel.editing) {
                return;
            }
            setEditing(false);
            var currentEditor = editModel.currentEditor;
            if (currentEditor) {
                if (currentEditor.removeEscapeStackHandler) {
                    currentEditor.removeEscapeStackHandler();
                }
                if (currentEditor.removeClickOffHandler) {
                    currentEditor.removeClickOffHandler();
                }
                if (currentEditor.decorator) {
                    grid.decorators.remove(currentEditor.decorator);
                }
            }
            grid.viewLayer.draw();
            grid.eventLoop.bindOnce('grid-draw', function () {
                if (grid.container) {
                    grid.container.focus();
                }
            });
        },
        cancelEdit: function () {
            editModel._closeEditor();
        },
        saveEdit: function () {
            if (!editModel.savePromise) {
                var currentEditor = editModel.currentEditor;
                var savePromise = currentEditor && currentEditor.save && currentEditor.save();
                var maybeSetPromise = savePromise && savePromise.then(function (dataResult) {
                    if (dataResult) {
                        if (editModel.currentEditor && editModel.currentEditor.decorator) {
                            var _a = editModel.currentEditor.decorator, top_1 = _a.top, left = _a.left;
                            if (top_1 !== undefined && left !== undefined) {
                                dataResult.row = top_1;
                                dataResult.col = left;
                                grid.dataModel.set([dataResult]);
                            }
                        }
                    }
                    return dataResult;
                }) || Promise.resolve();
                editModel.savePromise = maybeSetPromise.then(function (result) {
                    editModel._closeEditor();
                    return result;
                });
            }
            return editModel.savePromise;
        },
    };
    editModel._defaultDecorator.render = function () {
        var element = document.createElement('textarea');
        element.style.pointerEvents = 'all';
        element.style.zIndex = '1';
        element.style.position = 'relative';
        grid.eventLoop.bindOnce('grid-draw', function () {
            var top = editModel._defaultDecorator.top;
            var left = editModel._defaultDecorator.left;
            element.value = editModel._defaultDecorator.typedText && editModel._defaultDecorator.typedText() ||
                (top != undefined && left != undefined && grid.dataModel.get(top, left).formatted) ||
                '';
            element.focus();
        });
        editModel._defaultDecorator.renderedElem = element;
        return element;
    };
    function hasTrigger(trigger, triggers) {
        return triggers.indexOf(trigger) !== -1;
    }
    function optsHasEditTrigger(opts, trigger) {
        return hasTrigger(trigger, opts.editTriggers);
    }
    function optsHasCancelTrigger(opts, trigger) {
        return hasTrigger(trigger, opts.cancelTriggers);
    }
    function optsHasSaveTrigger(opts, trigger) {
        return hasTrigger(trigger, opts.saveTriggers);
    }
    function getOptsForCol(col) {
        var colDescriptor = grid.data.col.get(col);
        if (!colDescriptor) {
            return;
        }
        return editModel._hydrateOpts(colDescriptor.editOptions);
    }
    function setEditing(editing) {
        var prevEditing = editModel.editing;
        editModel.editing = editing;
        if (prevEditing !== editing) {
            grid.eventLoop.fire('grid-edit');
        }
    }
    grid.eventLoop.bind('grid-destroy', function () {
        editModel.cancelEdit();
    });
    grid.eventLoop.addInterceptor(editModel._interceptor);
    return editModel;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map