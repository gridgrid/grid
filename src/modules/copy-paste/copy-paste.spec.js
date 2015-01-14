var mockEvent = require('../custom-event');
var key = require('key');
describe('copy-paste', function () {


    require('../grid-spec-helper')();
    beforeEach(function () {
        this.buildSimpleGrid();
        this.viewBuild(); //to get the textarea
        jasmine.addMatchers({
            toHaveBeenCalledWithAllPointsInRange: function () {
                return {
                    compare: function (spy, range) {
                        var allArgs = spy.calls.allArgs();
                        var fails = [];
                        for (var r = range.top; r < range.top + range.height; r++) {
                            for (var c = range.left; c < range.left + range.width; c++) {
                                var hadArgs = allArgs.some(function (args) {
                                    return args[0] === r && args[1] === c;
                                });
                                if (!hadArgs) {
                                    fails.push(r + ',' + c);
                                }
                            }
                        }
                        var pass = !fails.length;
                        return {
                            pass: pass,
                            message: 'Expected ' + spy.and.identity() + (!pass ? '' : ' not' ) + ' to have been called with all points in range ' + JSON.stringify(range) + ' but ' + JSON.stringify(fails) + ' were missing'
                        };
                    }
                };
            }
        });

        this.tableString = '<table><tbody><tr><td>r1 c2</td><td>r1 c3</td></tr><tr><td>r2 c2</td><td>r2 c3</td></tr></tbody></table>';
    });


    function expectSpyToHaveBeenCalledWithAllPointsInRange(spy, range) {

    }

    function expectProperRanges(expectFn, async) {
        it('should get the copy data for the selected range', function (cb) {
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            expectFn.call(this, selectionRange, cb);
            if (!async) {
                cb();
            }
        });

        it('should get the copy data for the focus range if no selection', function (cb) {
            this.grid.navigationModel.setFocus(1, 2);
            expectFn.call(this, {top: 1, left: 2, width: 1, height: 1}, cb);
            if (!async) {
                cb();
            }
        });

        it('should prefer the selection to the focus', function (cb) {
            this.grid.navigationModel.setFocus(1, 2);
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);

            expectFn.call(this, selectionRange, cb);
            if (!async) {
                cb();
            }
        });
    }

    describe('copy', function () {
        function fireCopy() {
            var e = {type: 'copy'};
            e.preventDefault = jasmine.createSpy('preventDefault');
            e.clipboardData = {setData: jasmine.createSpy('setData')};
            this.grid.eventLoop.fire(e);
            return e;
        }

        expectProperRanges(function expectCopyDataForRange(selectionRange) {
            var spy = spyOn(this.grid.dataModel, 'getCopyData').and.callThrough();
            fireCopy.call(this);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWithAllPointsInRange(selectionRange);
        });

        it('should put copy data into clipboard', function () {
            var selectionRange = {top: 1, left: 2, width: 2, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            var e = fireCopy.call(this);
            expect(this.grid.textarea.innerHTML).toEqual(this.tableString);
            expect(window.getSelection().toString()).toContain('r1 c2');
            expect(window.getSelection().toString()).toContain('r1 c3');
            expect(window.getSelection().toString()).toContain('r2 c2');
            expect(window.getSelection().toString()).toContain('r2 c3');
        });

        describe('text area selection', function () {
            beforeEach(function () {
                //clear selection
                this.grid.textarea.value = '';
                expect(this.grid.textarea.selectionStart).toEqual(this.grid.textarea.selectionEnd);
            });

            function expectSelectionAfterTimeout(cb, noSelection) {
                setTimeout((function () {
                    var expected = expect(window.getSelection().toString());
                    if (noSelection) {
                        expected = expected.not;
                    }
                    expected.toEqual('gridtext');
                    cb();
                }).bind(this), 2);
            }

            it('should have selected text after any keyup', function (cb) {
                this.grid.eventLoop.fire(mockEvent('keyup'));
                expectSelectionAfterTimeout.call(this, cb);
            });

            it('should have selected text on focus', function (cb) {
                this.grid.textarea.blur();
                this.grid.textarea.focus();
                expectSelectionAfterTimeout.call(this, cb);
            });

            it('should honor a disabling function', function (cb) {
                this.grid.copyPaste.isSelectionDisabled = function () {
                    return true;
                };
                this.grid.eventLoop.fire(mockEvent('keyup'));
                this.grid.textarea.blur();
                this.grid.textarea.focus();
                expectSelectionAfterTimeout.call(this, cb, true)
            });
        });
    });

    describe('paste', function () {
        function firePaste(data) {
            var e = {type: 'paste'};
            e.clipboardData = {
                getData: function () {
                    return data || 'r1 c2\tr1 c3\nr2 c2\tr2 c3'
                }
            };
            spyOn(e.clipboardData, 'getData').and.callThrough();
            this.grid.eventLoop.fire(e);
            return e;
        }

        function expectPasteForRange(range, cb, mockGetData) {
            var spy = spyOn(this.grid.dataModel, 'set');
            var e = firePaste.call(this)
            if (mockGetData) {
                e.clipboardData.getData.and.returnValue(undefined);
            }
            setTimeout(function () {
                var args = spy.calls.argsFor(0)[0];
                for (var r = range.top; r < range.top + range.height; r++) {
                    for (var c = range.left; c < range.left + range.width; c++) {
                        expect(args).toContain({row: r, col: c, data: 'r' + r + ' c' + c, paste: true});
                    }
                }
                cb();
            }, 2);

        }

        expectProperRanges(expectPasteForRange, true);


        it('should handle pasted html', function (cb) {
            var selectionRange = {top: 1, left: 2, width: 2, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            this.grid.textarea.innerHTML = this.tableString;
            expectPasteForRange.call(this, selectionRange, cb, true);
        });
    });

});