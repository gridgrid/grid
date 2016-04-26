var mockEvent = require('../custom-event');
var key = require('key');
var util = require('../util');

describe('copy-paste', function() {

    require('../grid-spec-helper')();
    beforeEach(function() {
        this.buildSimpleGrid();
        this.viewBuild(); //to get the textarea
        this.grid.textarea.focus();
        this.tableString = '<table><tbody><tr><td grid-data="[1,2]">r1 c2</td><td grid-data="[1,3]">r1 c3</td></tr><tr><td grid-data="[2,2]">r2 c2</td><td grid-data="[2,3]">r2 c3</td></tr></tbody></table>';
    });

    function expectProperRanges(expectFn, async) {
        it('should get the copy data for the selected range', function(cb) {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 1,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            expectFn.call(this, selectionRange, cb);
            if (!async) {
                cb();
            }
        });

        it('should get the copy data for the focus range if no selection', function(cb) {
            this.grid.navigationModel.setFocus(1, 2);
            expectFn.call(this, {
                top: 1,
                left: 2,
                width: 1,
                height: 1
            }, cb);
            if (!async) {
                cb();
            }
        });

        it('should prefer the selection to the focus', function(cb) {
            this.grid.navigationModel.setFocus(1, 2);
            var selectionRange = {
                top: 1,
                left: 2,
                width: 1,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);

            expectFn.call(this, selectionRange, cb);
            if (!async) {
                cb();
            }
        });
    }

    describe('copy', function() {
        function fireCopy() {
            var e = {
                type: 'copy'
            };
            e.preventDefault = jasmine.createSpy('preventDefault');
            e.clipboardData = {
                setData: jasmine.createSpy('setData')
            };
            this.grid.eventLoop.fire(e);
            return e;
        }

        expectProperRanges(function expectCopyDataForRange(selectionRange) {
            var spy = spyOn(this.grid.dataModel, 'get').and.callThrough();
            fireCopy.call(this);
            expect(spy).toHaveBeenCalled();
            expect(spy.calls.argsFor(0)[2]).toBe(true); //make sure it's called with the copy flag
            expect(spy).toHaveBeenCalledWithAllPointsInRange(selectionRange);
        });

        it('should put copy data into clipboard', function() {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            var e = fireCopy.call(this);
            expect(e.clipboardData.setData).toHaveBeenCalledWith('text/plain', 'r1 c2\tr1 c3\nr2 c2\tr2 c3');
            expect(e.clipboardData.setData).toHaveBeenCalledWith('text/html', this.tableString);
        });

        it('should replace \n with <br> in copied html', function() {
            this.grid.dataModel.set(1, 2, ['something\nwith lines', '2']);
            var selectionRange = {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            var e = fireCopy.call(this);
            expect(e.clipboardData.setData).toHaveBeenCalledWith('text/plain', '"rsomething\nwith lines c2"\tr1 c3\nr2 c2\tr2 c3');
            expect(e.clipboardData.setData).toHaveBeenCalledWith('text/html', '<table><tbody><tr><td grid-data="[&quot;something\\nwith lines&quot;,&quot;2&quot;]">rsomething<br>with lines c2</td><td grid-data="[1,3]">r1 c3</td></tr><tr><td grid-data="[2,2]">r2 c2</td><td grid-data="[2,3]">r2 c3</td></tr></tbody></table>');
        });

        it('should not paste if textarea isnt focused', function() {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            this.grid.textarea.blur();
            var e = fireCopy.call(this);
            expect(this.grid.textarea.textContent).not.toContain('r1 c2');
        });


        describe('text area selection', function() {
            beforeEach(function() {
                //clear selection
                this.grid.textarea.value = '';
                expect(this.grid.textarea.selectionStart).toEqual(this.grid.textarea.selectionEnd);
            });

            function expectSelectionAfterTimeout(cb, noSelection) {
                setTimeout((function() {
                    var expected = expect(window.getSelection().toString());
                    if (!noSelection) {
                        expected = expected.not;
                    }
                    expected.toEqual('');

                    cb();
                }).bind(this), 2);
            }

            it('should have selected text after any keyup', function(cb) {
                clearTimeout(this.grid.copyPaste._maybeSelectText.timeout);
                this.grid.eventLoop.fire(mockEvent('keyup'));
                expectSelectionAfterTimeout.call(this, cb);
            });


            it('should not have selected text after mousedown not in the area', function(cb) {
                clearTimeout(this.grid.copyPaste._maybeSelectText.timeout);
                this.grid.eventLoop.fire({
                    type: 'mousedown'
                });
                expectSelectionAfterTimeout.call(this, cb, true);
            });

            it('should have selected text after mousedown in the area', function(cb) {
                clearTimeout(this.grid.copyPaste._maybeSelectText.timeout);
                this.grid.eventLoop.fire({
                    type: 'mousedown',
                    target: this.grid.textarea
                });
                expectSelectionAfterTimeout.call(this, cb);
            });

            it('should have selected text on focus', function(cb) {
                this.grid.textarea.blur();
                clearTimeout(this.grid.copyPaste._maybeSelectText.timeout);
                this.grid.textarea.focus();
                expectSelectionAfterTimeout.call(this, cb);
            });

            it('should not select when grid is editing', function(cb) {
                this.grid.editModel = {
                    editing: true
                }
                this.grid.eventLoop.fire(mockEvent('keyup'));
                this.grid.textarea.blur();
                this.grid.textarea.focus();
                expectSelectionAfterTimeout.call(this, cb, true)
            });

            it('should not have selected text after any keyup if unfocused', function(cb) {
                this.grid.textarea.blur();
                clearTimeout(this.grid.copyPaste._maybeSelectText.timeout);
                this.grid.eventLoop.fire(mockEvent('keyup'));
                expectSelectionAfterTimeout.call(this, cb, true);
            });
        });
    });

    describe('paste', function() {
        function firePaste(data) {
            var e = {
                type: 'paste'
            };
            e.preventDefault = jasmine.createSpy('preventDefault');
            e.clipboardData = {
                getData: function() {
                    return data || 'r1 c2\tr1 c3\nr2 c2\tr2 c3'
                }
            };
            spyOn(e.clipboardData, 'getData').and.callThrough();
            this.grid.eventLoop.fire(e);
            return e;
        }

        function expectPasteForRange(ranges, cb, mockGetData, expectedData, getDataOverride) {
            var spy = spyOn(this.grid.dataModel, 'set');
            var e = firePaste.call(this, getDataOverride || expectedData)
            if (mockGetData) {
                e.clipboardData.getData.and.returnValue();
            }
            setTimeout(function() {
                var args = spy.calls.argsFor(0)[0];
                if (!util.isArray(ranges)) {
                    ranges = [ranges];
                }
                ranges.forEach(function(range) {
                    for (var r = range.top; r < range.top + range.height; r++) {
                        for (var c = range.left; c < range.left + range.width; c++) {
                            expect(args).toContain({
                                row: r,
                                col: c,
                                value: util.isArray(expectedData) && expectedData[r - range.top][c - range.left] || undefined,
                                formatted: typeof expectedData === 'string' && expectedData || 'r' + r + ' c' + c,
                                paste: true
                            });
                        }
                    }
                });
                cb();
            }, 2);

        }

        expectProperRanges(expectPasteForRange, true);

        it('should not paste if textarea isnt focused', function(cb) {
            this.grid.textarea.blur();
            var spy = spyOn(this.grid.dataModel, 'set');
            firePaste.call(this);
            setTimeout(function() {
                expect(spy).not.toHaveBeenCalled();
                cb();
            }, 2);
        });

        it('should handle pasted html', function(cb) {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            expectPasteForRange.call(this, selectionRange, cb, true, [
                [
                    [1, 2],
                    [1, 3]
                ],
                [
                    [2, 2],
                    [2, 3]
                ]
            ], this.tableString);
        });

        it('should paste an area smaller than the selection', function(cb) {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 3,
                height: 4
            };
            this.grid.navigationModel.setSelection(selectionRange);
            expectPasteForRange.call(this, {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            }, cb);
        });

        it('should repeat a single value across the range', function(cb) {
            var selectionRange = {
                top: 1,
                left: 2,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.setSelection(selectionRange);
            var otherSelection = {
                top: 3,
                left: 4,
                width: 2,
                height: 2
            };
            this.grid.navigationModel.otherSelections.push(otherSelection);
            expectPasteForRange.call(this, [selectionRange, otherSelection], cb, true, 'singleval');
        });
    });

});
