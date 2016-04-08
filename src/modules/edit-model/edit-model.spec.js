var mockEvent = require('../custom-event');
var key = require('key');
var util = require('../util');

fdescribe('edit-model', function() {

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
    beforeEach(function() {
        this.buildSimpleGrid(null, null, null, null, null, null, null, null, {
            allowEdit: true
        });
    });

    describe('_hydrateOpts', function() {
        describe('action field ', function() {
            it('should create a default getEditor function', function() {
                var promise = new Promise(function() {}, function() {});
                var opts = {
                    action: function() {
                        return promise;
                    }
                };
                opts = this.grid.editModel._hydrateOpts(opts);
                expect(opts.getEditor).toBeAFunction();
                var editor = opts.getEditor();
                expect(editor.decorator).toEqual(false);
                expect(editor.save).toEqual(undefined);
                expect(editor.closePromise).toBe(promise);
            });
        });

        it('should handle the no options case', function() {
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
            describe(triggerName, function() {
                afterEach(function() {
                    var opts = this.grid.editModel._hydrateOpts(this.opts);
                    expect(opts[triggerName]).toEqual(this[triggerName]);
                });

                it('should not default if supplied for action', function() {
                    this.opts = {
                        action: function() {},
                    };
                    this.opts[triggerName] = defaultTriggers
                    this[triggerName] = defaultTriggers;
                });

                it('should not default if supplied for getEditor', function() {
                    this.opts = {
                        getEditor: function() {},
                    };
                    this.opts[triggerName] = defaultTriggers
                    this[triggerName] = defaultTriggers;
                });

                it('should default for action if not supplied', function() {
                    this.opts = {
                        action: function() {},
                    };
                    this[triggerName] = actionTriggers;
                });

                it('should default for getEditor if not supplied', function() {
                    this.opts = {
                        getEditor: function() {},
                    };
                    this[triggerName] = editModeTriggers;
                });
            });
        }

        describe('headers', function() {
            it('should default to false', function() {
                var opts = this.grid.editModel._hydrateOpts({});
                expect(opts.headers).toBe(false);
            })
        });
    });

    describe('delete should trigger for', function() {
        afterEach(function() {
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

        Object.keys(deleteTriggerToEvent).forEach(function(trigger) {
            it(trigger, function() {
                this.trigger = trigger;
            })
        });
    });

    describe('', function() {
        afterEach(function() {
            var event = editTriggerToEvent[this.trigger];
            var col = this.grid.data.col.get(event.col);
            col.editOptions = this.opts;
            this.grid.editModel._interceptor(event);
            expect(this.grid.editModel.editing).toBe(this.editing);
        });

        describe('should start editing if trigger exists in options for', function() {

            beforeEach(function() {
                this.editing = true;
            });
            Object.keys(editTriggerToEvent).forEach(function(trigger) {
                it(trigger, function() {
                    this.trigger = trigger;
                    this.opts = {
                        editTriggers: [trigger]
                    };
                })
            });

        });

        describe('should not start editing if trigger does not exist in options for', function() {
            beforeEach(function() {
                this.editing = false;

            });

            Object.keys(editTriggerToEvent).forEach(function(trigger) {
                it(trigger, function() {
                    this.trigger = trigger;
                    this.opts = {
                        editTriggers: []
                    };
                })
            });

        });
    });

    describe('edit cell', function() {
        describe('default setup', function() {
            function makeOptsForEditor(editor) {
                return {
                    getEditor: function() {
                        return editor;
                    }
                }
            }

            afterEach(function() {
                var col = this.grid.data.col.get(1);
                col.editOptions = this.opts;
                this.grid.editModel.editCell(1, 1);
                expect(this.grid.editModel.currentEditor).toBeDefined();
                expect(this.grid.editModel.currentEditor.decorator).toEqual(this.decorator);
                if (this.saveDefined) {
                    expect(this.grid.editModel.currentEditor.save).toBeDefined();
                }
            });
            it('should be populated on editor if undefined', function() {
                this.opts = makeOptsForEditor({});
                this.decorator = this.grid.editModel._defaultDecorator;
            });

            it('should populate a save promise if decorator is undefined and save is undefined', function() {
                this.opts = makeOptsForEditor({});
                this.decorator = this.grid.editModel._defaultDecorator;
                this.saveDefined = true;
            });

            it('should not populate a save promise if decorator is undefined and save is defined', function() {
                this.opts = makeOptsForEditor({
                    save: new Promise(require('../no-op'), require('../no-op'))
                });
                this.decorator = this.grid.editModel._defaultDecorator;
            });

            it('should not be populated on editor if false', function() {
                this.opts = makeOptsForEditor({
                    decorator: false
                });
                this.decorator = false;
            });

            it('should not be populated on editor if decorator is defined', function() {
                var decorator = {};
                this.opts = makeOptsForEditor({
                    decorator: decorator // yes yes this is not really a decorator
                });
                this.decorator = decorator;
            });
        });

        describe('on headers', function() {
            it('should trigger if headers : true', function() {
                var col = this.grid.data.col.get(0);
                col.editOptions = {
                    headers: true
                };
                this.grid.editModel.editCell(-1, 0);
                expect(this.grid.editModel.editing).toBe(true);
            });

            it('should not trigger if headers : false', function() {
                var col = this.grid.data.col.get(0);
                col.editOptions = {
                    headers: false
                };
                this.grid.editModel.editCell(-1, 0);
                expect(this.grid.editModel.editing).toBe(false);
            });
        });

        describe('default decorator', function() {
            it('should render to a text area', function() {
                var elem = this.grid.editModel._defaultDecorator.render();
                expect(elem.tagName).toEqual('TEXTAREA');
            });

            it('should render with typedText', function() {
                this.grid.editModel.editCell(1, 1, true);
                var elem = this.grid.editModel._defaultDecorator.render();
                spyOn(this.grid.editModel._defaultDecorator, 'typedText').and.returnValue('mike');
                this.grid.eventLoop.fire('grid-draw');
                expect(elem.value).toEqual('mike');
            });

            it('should render with the cell value if not typing', function() {
                this.grid.editModel.editCell(1, 1);
                var elem = this.grid.editModel._defaultDecorator.render();
                this.grid.eventLoop.fire('grid-draw');
                expect(elem.value).toEqual(this.grid.dataModel.get(1, 1).formatted);
            });

            it('save method should return promise of text areas value', function(done) {
                this.grid.editModel.editCell(1, 1);
                var elem = this.grid.editModel._defaultDecorator.render();
                elem.value = 'moop';
                this.grid.editModel.currentEditor.save().then(function(result) {
                    expect(result.formatted).toEqual('moop');
                    expect(result.value).toEqual('moop');
                    done();
                });
            });
        });

        describe('decorator', function() {
            it('should be added on edit', function() {
                this.grid.editModel.editCell(1, 1);
                expect(this.grid.decorators.getAlive()).toContain(this.grid.editModel.currentEditor.decorator);
            });

            it('should be positioned at the editing cell', function() {
                this.grid.editModel.editCell(1, 1);
                expect(this.grid.editModel.currentEditor.decorator).rangeToBe(1, 1, 1, 1);
                expect(this.grid.editModel.currentEditor.decorator.units).toBe('cell');
                expect(this.grid.editModel.currentEditor.decorator.space).toBe('data');
            });

            it('should have a starting text function that returns text on typing', function() {
                this.grid.editModel.editCell(1, 1, true);
                var value = 'blahhhh';
                this.grid.textarea = {
                    value: value
                };
                expect(this.grid.editModel.currentEditor.decorator.typedText()).toBe(value);
            });


            it('should have a starting text function that returns empty for not typing', function() {
                this.grid.editModel.editCell(1, 1, false);
                var value = 'blahhhh';
                this.grid.textarea = {
                    value: value
                };
                expect(this.grid.editModel.currentEditor.decorator.typedText()).toBe('');
            });
        });
    });

    describe('close edit', function() {
        it('should not barf if called when not editing', function() {
            this.grid.editModel._closeEditor();
        });

        it('should remove previously added decorator', function() {
            this.grid.editModel.editCell(1, 1);
            var decorator = this.grid.editModel.currentEditor.decorator;
            this.grid.editModel._closeEditor();
            expect(this.grid.decorators.getAlive()).not.toContain(decorator);
        });

        it('should set editing back to false', function() {
            this.grid.editModel.editCell(1, 1);
            expect(this.grid.editModel.editing).toBe(true);
            this.grid.editModel._closeEditor();
            expect(this.grid.editModel.editing).toBe(false);
        });

        it('should ask the grid to draw and then focus it when it does', function() {
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

        it('should remove escape handler', function() {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel.currentEditor, 'removeEscapeStackHandler');
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
        });

        it('should remove cancel handler', function() {
            this.grid.editModel.editCell(1, 1);

            var spy = spyOn(this.grid.editModel.currentEditor, 'removeClickOffHandler');
            this.grid.editModel._closeEditor();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('cancelEdit', function() {
        it('should call close editor', function() {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.cancelEdit();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('save edit', function() {
        it('should call close editor', function(done) {
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.saveEdit();
            setTimeout(function() {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);

        });

        it('should call close editor if no save promise', function(done) {
            var col = this.grid.data.col.get(1);
            col.editOptions = {
                getEditor: function() {
                    return {
                        decorator: false
                    }
                }
            };
            this.grid.editModel.editCell(1, 1);
            var spy = spyOn(this.grid.editModel, '_closeEditor');
            this.grid.editModel.saveEdit();
            setTimeout(function() {
                expect(spy).toHaveBeenCalled();
                done();
            }, 1);
        });

        it('should call set on the data model with the result of the editors save promise', function(done) {
            var resolve;
            var col = this.grid.data.col.get(1);
            col.editOptions = {
                getEditor: function() {
                    return {
                        save: function() {
                            var promise = new Promise(function(r) {
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
            setTimeout(function() {
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
        describe(triggerActionName + 'Triggers', function() {
            afterEach(function(done) {
                var spy = spyOn(this.grid.editModel, triggerActionName + 'Edit').and.callThrough();
                var col = this.grid.data.col.get(1);
                col.editOptions = {
                    cancelTriggers: [],
                    editTriggers: [],
                    saveTriggers: []
                };
                col.editOptions[triggerActionName + 'Triggers'] = this.triggers;

                this.grid.navigationModel.setFocus(1, 1);
                this.grid.editModel.editCell(1, 1);
                this.doTrigger();
                var expectation = expect(spy);
                if (this.notCancel) {
                    expectation = expectation.not;
                }
                expectation.toHaveBeenCalled();
                setTimeout(function() {
                    if (this.extraExpect) {
                        this.extraExpect.call(this);
                    }
                    done();
                }, 1)

            });

            Object.keys(triggerToDoTrigger).forEach(function(triggerName) {
                it('should ' + triggerActionName + ' edit if in trigger array for ' + triggerName, function() {
                    this.triggers = [triggerName];
                    this.doTrigger = triggerToDoTrigger[triggerName];
                    this.extraExpect = triggerToPostTriggerExpect && triggerToPostTriggerExpect[triggerName];
                });

                it('should not ' + triggerActionName + 'edit if not in trigger array for ' + triggerName, function() {
                    this.triggers = [];
                    this.notCancel = true;
                    this.doTrigger = triggerToDoTrigger[triggerName];
                });
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
        enter: function() {
            expect(this.grid.navigationModel.focus.row).toBe(2);
            expect(this.grid.navigationModel.focus.col).toBe(1);
        },
        tab: function() {
            expect(this.grid.navigationModel.focus.row).toBe(1);
            expect(this.grid.navigationModel.focus.col).toBe(2);
        }
    });

});
