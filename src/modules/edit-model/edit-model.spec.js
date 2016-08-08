var mockEvent = require('../custom-event');
var key = require('key');
var util = require('../util');
var _ = require('lodash');
var noop = require('../no-op');

describe('edit-model', function () {

    //char code for z === 122
    //space 32
    //enter
    function mockKeyDown(code) {
        var event = mockEventOnDefaultEditableCells('keydown');
        event.keyCode = event.which = code;
        return event;
    }

    function mockKeyPress(code) {
        var event = mockEventOnDefaultEditableCells('keypress');
        event.keyCode = event.which = event.charCode = code;
        return event;
    }

    function mockKeyUp(code) {
        var event = mockEventOnDefaultEditableCells('keyup');
        event.keyCode = event.which = code;
        return event;
    }

    function mockEventOnDefaultEditableCells(name) {
        var e = mockEvent(name);
        e.row = 1;
        e.col = 1;
        return e;
    }

    var editTriggerToEvent = {
        click: mockEventOnDefaultEditableCells('click'),
        dblclick: mockEventOnDefaultEditableCells('dblclick'),
        space: mockKeyDown(key.code.special.space),
        enter: mockKeyDown(key.code.special.enter),
        typing: mockKeyPress(32)
    };

    // not currently configurable but may as well set them up this way
    var deleteTriggerToEvent = {
        delete: mockKeyDown(46), // have to be literal until alawson merges my add for delete
        backspace: mockKeyDown(key.code.special.backspace)
    };

    var defaultEditTriggers = ['dblclick', 'enter', 'typing'];
    var defaultActionTriggers = ['click', 'space', 'enter'];

    require('../grid-spec-helper')();
    beforeEach(function () {
        this.buildSimpleGrid(null, null, null, null, null, null, null, null, {
            allowEdit: true
        });
        this.grid.eventIsOnCells = function () {
            return true;
        }
    });

    describe('_hydrateOpts', function () {
        describe('action field ', function () {
            it('should create a default getEditor function', function () {
                var promise = new Promise(function () {}, function () {});
                var opts = {
                    action: function () {
                        return promise;
                    }
                };
                var actionSpy = spyOn(opts, 'action').and.callThrough();
                opts = this.grid.editModel._hydrateOpts(opts);
                expect(opts.getEditor).toBeAFunction();
                var editor = opts.getEditor(23);
                expect(editor.decorator).toEqual(false);
                expect(editor.save).toEqual(undefined);
                expect(editor.closePromise).toBe(promise);
                expect(actionSpy).toHaveBeenCalledWith(23);
            });
        });

        it('should handle the no options case', function () {
            var opts = this.grid.editModel._hydrateOpts();
            expect(opts.getEditor).toBeAFunction();
            var editor = opts.getEditor();
            expect(editor.decorator).toEqual(undefined);
            expect(editor.save).toEqual(undefined);
            expect(editor.closePromise).toEqual(undefined);
            expect(opts.headers).toEqual(false);
            expect(opts.editTriggers).toEqual(defaultEditTriggers);
        });

        testTriggers('editTriggers', ['space'], defaultActionTriggers, defaultEditTriggers);
        testTriggers('saveTriggers', ['tab'], [], ['tab', 'enter', 'clickoff']);
        testTriggers('cancelTriggers', ['clickoff'], [], ['escape']);

        function testTriggers(triggerName, defaultTriggers, actionTriggers, editModeTriggers) {
            describe(triggerName, function () {
                afterEach(function () {
                    var opts = this.grid.editModel._hydrateOpts(this.opts);
                    expect(opts[triggerName]).toEqual(this[triggerName]);
                });

                it('should not default if supplied for action', function () {
                    this.opts = {
                        action: function () {},
                    };
                    this.opts[triggerName] = defaultTriggers
                    this[triggerName] = defaultTriggers;
                });

                it('should not default if supplied for getEditor', function () {
                    this.opts = {
                        getEditor: function () {},
                    };
                    this.opts[triggerName] = defaultTriggers
                    this[triggerName] = defaultTriggers;
                });

                it('should default for action if not supplied', function () {
                    this.opts = {
                        action: function () {},
                    };
                    this[triggerName] = actionTriggers;
                });

                it('should default for getEditor if not supplied', function () {
                    this.opts = {
                        getEditor: function () {},
                    };
                    this[triggerName] = editModeTriggers;
                });
            });
        }

        describe('headers', function () {
            it('should default to false', function () {
                var opts = this.grid.editModel._hydrateOpts({});
                expect(opts.headers).toBe(false);
            })
        });
    });

    describe('delete should trigger for', function () {
        afterEach(function () {
            var event = deleteTriggerToEvent[this.trigger];
            var range = {
                top: 1,
                left: 2,
                width: 1,
                height: 2
            };
            this.grid.navigationModel.setSelection(range);
            var spy = spyOn(this.grid.dataModel, 'set');
            this.grid.editModel._interceptor(event);
            var args = spy.calls.argsFor(0)[0];

            for (var r = range.top; r < range.top + range.height; r++) {
                for (var c = range.left; c < range.left + range.width; c++) {
                    expect(args).toContain({
                        row: r,
                        col: c,
                        value: undefined
                    });
                }
            }
        });

        Object.keys(deleteTriggerToEvent).forEach(function (trigger) {
            it(trigger, function () {
                this.trigger = trigger;
            })
        });
    });

    describe('editTriggers', function () {
        afterEach(function () {
            var event = this.event;
            var col = this.grid.data.col.get(event.col);
            col.editOptions = this.opts;
            var spy = spyOn(this.grid.editModel, 'editCell');
            this.grid.editModel._interceptor(event);
            var expectation = expect(spy);
            if (!this.editing) {
                expectation = expectation.not;
            }
            expectation.toHaveBeenCalled();
        });

        Object.keys(editTriggerToEvent).forEach(function (trigger) {
            it('should start editing if trigger exists in options for' + trigger, function () {
                this.editing = true;
                this.trigger = trigger;
                this.event = editTriggerToEvent[trigger];
                this.opts = {
                    editTriggers: [trigger]
                };
            })

            it('should not start editing if trigger does not exist in options for' + trigger, function () {

                this.trigger = trigger;
                this.event = editTriggerToEvent[trigger];
                this.opts = {
                    editTriggers: []
                };
                this.editing = false;
            });
            if (trigger == 'click' || trigger === 'dblclick') {
                it('should not start editing for if not on cells for ' + trigger, function () {
                    this.grid.eventIsOnCells = function () {
                        return false;
                    }
                    this.editing = false;
                    this.trigger = trigger;
                    this.event = editTriggerToEvent[trigger];
                    this.opts = {
                        editTriggers: [trigger]
                    };
                });
            }
        });

        it('should not starting editing for typing if meta keys are pressed', function () {
            this.event = mockKeyPress(32);
            this.event.metaKey = true;
            this.editing = false;
            this.trigger = 'typing';
            this.opts = {
                editTriggers: ['typing']
            };
        });

        it('should not starting editing for typing if shift keys are pressed', function () {
            this.event = mockKeyPress(32);
            this.event.altKey = true;
            this.editing = false;
            this.trigger = 'typing';
            this.opts = {
                editTriggers: ['typing']
            };
        });

        it('should not starting editing for typing if ctrl keys are pressed', function () {
            this.event = mockKeyPress(32);
            this.event.ctrlKey = true;
            this.editing = false;
            this.trigger = 'typing';
            this.opts = {
                editTriggers: ['typing']
            };
        });
    });

    function makeOptsForEditor(editor) {
        return {
            getEditor: function () {
                return editor;
            }
        }
    }

    describe('edit cell', function () {
        beforeEach(function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: undefined,
                save: undefined,
                closePromise: new Promise(noop)
            });
        });

        it('should call getEditor with the edited row', function () {
            var col = this.grid.data.col.get(1);
            var spy = spyOn(col.editOptions, 'getEditor');
            this.grid.editModel.editCell(1, 1);
            expect(spy).toHaveBeenCalledWith(1, undefined);
        });

        it('should call getEditor with the row and optionalEvent if available', function () {
            var col = this.grid.data.col.get(1);
            var spy = spyOn(col.editOptions, 'getEditor');
            var event = {};
            this.grid.editModel.editCell(1, 1, null, event);
            expect(spy).toHaveBeenCalledWith(1, event);
        });

        it('should fire the grid-edit event', function () {
            var spy = jasmine.createSpy();
            this.grid.eventLoop.bind('grid-edit', spy);
            this.grid.editModel.editCell(1, 1);
            expect(spy).toHaveBeenCalled();
        });

        it('should save previous edit if already editing', function () {
            this.grid.editModel.editCell(1, 2);
            var spy = spyOn(this.grid.editModel, 'saveEdit');
            this.grid.editModel.editCell(1, 1);
            expect(spy).toHaveBeenCalled();
        });

        it('should leave editing mode if no editor', function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor();
            this.grid.editModel.editCell(1, 1);
            expect(this.grid.editModel.editing).toEqual(false);
        });

        it('should leave editing mode if no closePromise', function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: false,
                save: undefined,
                closePromise: null
            });
            this.grid.editModel.editCell(1, 1);
            expect(this.grid.editModel.editing).toEqual(false);
        });

        it('should call save on closePromise resolve', function (done) {
            var resolve;
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: false,
                save: undefined,
                closePromise: new Promise(function (r) {
                    resolve = r;
                })
            });
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, 'saveEdit');
            resolve();
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);

        });

        it('should call cancel on closePromise reject', function (done) {
            var reject;
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: false,
                save: undefined,
                closePromise: new Promise(function (resolve, r) {
                    reject = r;
                })
            });
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, 'cancelEdit');
            reject();
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);
        });

        describe('default setup', function () {


            afterEach(function () {
                var col = this.grid.data.col.get(1);
                col.editOptions = this.opts;
                this.grid.editModel.editCell(1, 1);
                if (this.grid.editModel.currentEditor) {
                    expect(this.grid.editModel.currentEditor.decorator).toEqual(this.decorator);
                }
                if (this.saveDefined) {
                    expect(this.grid.editModel.currentEditor.save).toBeDefined();
                }
            });
            it('should populate default decorator on editor if undefined', function () {
                this.opts = makeOptsForEditor({});
                this.decorator = this.grid.editModel._defaultDecorator;
            });

            it('should populate a save promise if decorator is undefined and save is undefined', function () {
                this.opts = makeOptsForEditor({});
                this.decorator = this.grid.editModel._defaultDecorator;
                this.saveDefined = true;
            });

            it('should not populate a save promise if decorator is undefined and save is defined', function () {
                this.opts = makeOptsForEditor({
                    save: new Promise(require('../no-op'), require('../no-op'))
                });
                this.decorator = this.grid.editModel._defaultDecorator;
            });

            it('should not populate default decorator on editor if false', function () {
                this.opts = makeOptsForEditor({
                    decorator: false
                });
                this.decorator = false;
            });

            it('should not populate default decorator on editor if decorator is defined', function () {
                var decorator = {};
                this.opts = makeOptsForEditor({
                    decorator: decorator // yes yes this is not really a decorator
                });
                this.decorator = decorator;
            });


        });

        describe('on headers', function () {
            it('should trigger if headers : true', function () {
                var col = this.grid.data.col.get(0);
                col.editOptions = {
                    headers: true
                };
                this.grid.editModel.editCell(-1, 0);
                expect(this.grid.editModel.editing).toBe(true);
            });

            it('should not trigger if headers : false', function () {
                var col = this.grid.data.col.get(0);
                col.editOptions = {
                    headers: false
                };
                this.grid.editModel.editCell(-1, 0);
                expect(this.grid.editModel.editing).toBe(false);
            });
        });

        describe('default decorator', function () {
            it('should render to a text area', function () {
                var elem = this.grid.editModel._defaultDecorator.render();
                expect(elem.tagName).toEqual('TEXTAREA');
            });

            it('should render with typedText', function () {
                this.grid.editModel.editCell(1, 1, true);
                var elem = this.grid.editModel._defaultDecorator.render();
                spyOn(this.grid.editModel._defaultDecorator, 'typedText').and.returnValue('mike');
                this.grid.eventLoop.fire('grid-draw');
                expect(elem.value).toEqual('mike');
            });

            it('should render with the cell value if not typing', function () {
                this.grid.editModel.editCell(1, 1);
                var elem = this.grid.editModel._defaultDecorator.render();
                this.grid.eventLoop.fire('grid-draw');
                expect(elem.value).toEqual(this.grid.dataModel.get(1, 1).formatted);
            });

            it('save method should return promise of text areas value', function (done) {
                this.grid.editModel.editCell(1, 1);
                var elem = this.grid.editModel._defaultDecorator.render();
                elem.value = 'moop';
                this.grid.editModel.currentEditor.save().then(function (result) {
                    expect(result.formatted).toEqual('moop');
                    expect(result.value).toEqual('moop');
                    done();
                });
            });
        });

        describe('decorator', function () {
            it('should be added on edit', function () {
                this.grid.editModel.editCell(1, 1);
                expect(this.grid.decorators.getAlive()).toContain(this.grid.editModel.currentEditor.decorator);
            });

            it('should be positioned at the editing cell', function () {
                this.grid.editModel.editCell(1, 1);
                expect(this.grid.editModel.currentEditor.decorator).rangeToBe(1, 1, 1, 1);
                expect(this.grid.editModel.currentEditor.decorator.units).toBe('cell');
                expect(this.grid.editModel.currentEditor.decorator.space).toBe('data');
            });

            it('should have a starting text function that returns text on typing', function () {
                this.grid.editModel.editCell(1, 1, true);
                var value = 'blahhhh';
                this.grid.textarea = {
                    value: value
                };
                expect(this.grid.editModel.currentEditor.decorator.typedText()).toBe(value);
            });


            it('should have a starting text function that returns empty for not typing', function () {
                this.grid.editModel.editCell(1, 1, false);
                var value = 'blahhhh';
                this.grid.textarea = {
                    value: value
                };
                expect(this.grid.editModel.currentEditor.decorator.typedText()).toBe('');
            });
        });
    });

    describe('close edit', function () {
        beforeEach(function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: undefined,
                save: undefined,
                closePromise: new Promise(noop, noop)
            });
        });
        it('should not barf if called when not editing', function () {
            this.grid.editModel._closeEditor();
        });

        it('should remove previously added decorator', function () {
            this.grid.editModel.editCell(1, 1);
            var decorator = this.grid.editModel.currentEditor.decorator;
            this.grid.editModel._closeEditor();
            expect(this.grid.decorators.getAlive()).not.toContain(decorator);
        });

        it('should set editing back to false', function () {
            this.grid.editModel.editCell(1, 1);
            expect(this.grid.editModel.editing).toBe(true);
            this.grid.editModel._closeEditor();
            expect(this.grid.editModel.editing).toBe(false);
        });

        it('should ask the grid to draw and then focus it when it does', function () {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.viewLayer, 'draw');
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
            this.grid.container = {
                focus: jasmine.createSpy('focus')
            };
            this.grid.eventLoop.fire('grid-draw');
            expect(this.grid.container.focus).toHaveBeenCalled();
        });

        it('should remove escape handler', function () {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel.currentEditor, 'removeEscapeStackHandler');
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
        });

        it('should remove cancel handler', function () {
            this.grid.editModel.editCell(1, 1);

            var spy = spyOn(this.grid.editModel.currentEditor, 'removeClickOffHandler');
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
        });

        it('should fire the grid-edit event', function () {
            var spy = jasmine.createSpy();
            this.grid.editModel.editCell(1, 1);
            this.grid.eventLoop.bind('grid-edit', spy);
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('cancelEdit', function () {
        beforeEach(function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: undefined,
                save: undefined,
                closePromise: new Promise(noop, noop)
            });
        });
        it('should call close editor', function () {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.cancelEdit();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('save edit', function () {
        beforeEach(function () {
            var col = this.grid.data.col.get(1);
            col.editOptions = makeOptsForEditor({
                decorator: undefined,
                save: undefined,
                closePromise: new Promise(noop, noop)
            });
        });
        it('should call close editor', function (done) {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.saveEdit();
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);

        });

        it('should call close editor if no save promise', function (done) {
            var col = this.grid.data.col.get(1);
            col.editOptions = {
                getEditor: function () {
                    return {
                        decorator: false,
                        closePromise: new Promise(noop, noop)
                    }
                }
            };
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.saveEdit();
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);
        });

        it('should call close editor only once no matter how many saves are called', function (done) {
            var col = this.grid.data.col.get(1);
            col.editOptions = {
                getEditor: function () {
                    return {
                        decorator: false,
                        closePromise: new Promise(noop, noop)
                    }
                }
            };
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.saveEdit();
            this.grid.editModel.saveEdit();
            setTimeout(function () {
                expect(spy.calls.count()).toBe(1);
                done();
            }, 1);
        });

        it('should call set on the data model with the result of the editors save promise', function (done) {
            var resolve;
            var col = this.grid.data.col.get(1);
            col.editOptions = {
                getEditor: function () {
                    return {
                        save: function () {
                            var promise = new Promise(function (r) {
                                resolve = r;
                            });
                            return promise;
                        }
                    };
                }
            };
            this.grid.editModel.editCell(1, 1);
            this.grid.editModel.saveEdit();
            var spy = spyOn(this.grid.dataModel, 'set');
            var saveResult = {
                value: undefined,
                formatted: 'resolution'
            };
            resolve(saveResult);
            var dataChange = {
                row: 1,
                col: 1
            };
            dataChange.formatted = saveResult.formatted;
            dataChange.value = saveResult.value;
            setTimeout(function () {
                expect(spy).toHaveBeenCalledWith([dataChange]);
                done();
            }, 2);

        });
    });

    function fireEscape() {
        document.body.dispatchEvent(mockKeyDown(27));
        document.body.dispatchEvent(mockKeyPress(27));
        document.body.dispatchEvent(mockKeyUp(27));
    }

    function fireClickOff() {
        document.body.dispatchEvent(mockEvent('mousedown', true));
        document.body.dispatchEvent(mockEvent('mouseup', true));
        document.body.dispatchEvent(mockEvent('click', true));
    }

    function fireTab() {
        this.grid.editModel._interceptor(mockKeyDown(key.code.special.tab));
    }

    function fireEnter() {
        this.grid.editModel._interceptor(mockKeyDown(key.code.special.enter));
    }

    function testPostEditTriggers(triggerActionName, triggerToDoTrigger, triggerToPostTriggerExpect) {
        describe(triggerActionName + 'Triggers', function () {
            afterEach(function (done) {

                var col = this.grid.data.col.get(1);
                col.editOptions = _.assign(col.editOptions || {}, {
                    cancelTriggers: [],
                    editTriggers: [],
                    saveTriggers: []
                });
                col.editOptions[triggerActionName + 'Triggers'] = this.triggers;

                this.grid.navigationModel.setFocus(1, 1);
                this.grid.editModel.editCell(1, 1);
                var spy = spyOn(this.grid.editModel, triggerActionName + 'Edit').and.callThrough();
                this.doTrigger();
                var expectation = expect(spy);
                if (this.notCancel) {
                    expectation = expectation.not;
                }
                expectation.toHaveBeenCalled();
                setTimeout(function () {
                    if (this.extraExpect) {
                        this.extraExpect.call(this);
                    }
                    done();
                }, 1)

            });

            Object.keys(triggerToDoTrigger).forEach(function (triggerName) {
                it('should ' + triggerActionName + ' edit if in trigger array for ' + triggerName, function () {
                    this.triggers = [triggerName];
                    this.doTrigger = triggerToDoTrigger[triggerName];
                    this.extraExpect = triggerToPostTriggerExpect && triggerToPostTriggerExpect[triggerName];
                });

                it('should not ' + triggerActionName + 'edit if not in trigger array for ' + triggerName, function () {
                    this.triggers = [];
                    this.notCancel = true;
                    this.doTrigger = triggerToDoTrigger[triggerName];
                });
            });

            it('should not ' + triggerActionName + ' for enter if shift is pressed', function () {
                this.triggers = ['enter'];
                this.doTrigger = function () {
                    var e = mockKeyDown(key.code.special.enter);
                    e.shiftKey = true;
                    this.grid.editModel._interceptor(e);
                };
                this.notCancel = true;
            });

            it('should not ' + triggerActionName + ' for clickoff if isInMe returns true from editor', function () {
                var col = this.grid.data.col.get(1);
                col.editOptions = makeOptsForEditor({
                    isInMe: function (e) {
                        return !!e;
                    }
                });
                this.triggers = ['clickoff'];
                this.doTrigger = fireClickOff;
                this.notCancel = true;
            });
        });
    }

    testPostEditTriggers('cancel', {
        clickoff: fireClickOff,
        escape: fireEscape
    });


    testPostEditTriggers('save', {
        clickoff: fireClickOff,
        escape: fireEscape,
        enter: fireEnter,
        tab: fireTab
    }, {
        enter: function () {
            expect(this.grid.navigationModel.focus.row).toBe(2);
            expect(this.grid.navigationModel.focus.col).toBe(1);
        },
        tab: function () {
            expect(this.grid.navigationModel.focus.row).toBe(1);
            expect(this.grid.navigationModel.focus.col).toBe(2);
        }
    });

});
