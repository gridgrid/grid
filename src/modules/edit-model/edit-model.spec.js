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

    describe('edit decorator', function() {

    });
});
