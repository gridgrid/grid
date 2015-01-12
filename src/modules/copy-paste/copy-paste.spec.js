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
    });


    function expectSpyToHaveBeenCalledWithAllPointsInRange(spy, range) {

    }

    function expectProperRanges(expectFn) {
        it('should get the copy data for the selected range', function () {
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            expectFn.call(this, selectionRange);
        });

        it('should get the copy data for the focus range if no selection', function () {
            this.grid.navigationModel.setFocus(1, 2);
            expectFn.call(this, {top: 1, left: 2, width: 1, height: 1});
        });

        it('should prefer the selection to the focus', function () {
            this.grid.navigationModel.setFocus(1, 2);
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);

            expectFn.call(this, selectionRange);
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
            expect(e.clipboardData.setData).toHaveBeenCalledWith('Text', 'r1 c2\tr1 c3\nr2 c2\tr2 c3');
            expect(e.preventDefault).toHaveBeenCalled();
        });

        describe('text area selection', function () {
            beforeEach(function () {
                //clear selection
                this.grid.textarea.value = '';
                expect(this.grid.textarea.selectionStart).toEqual(this.grid.textarea.selectionEnd);
            });

            function expectSelectionAfterTimeout(cb, noSelection) {
                setTimeout((function () {
                    var expected = expect(this.grid.textarea.selectionStart);
                    if (!noSelection) {
                        expected = expected.not;
                    }
                    expected.toEqual(this.grid.textarea.selectionEnd);
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
        function firePaste() {
            var e = {type: 'paste'};
            e.clipboardData = {
                getData: function () {
                    return 'R1 C2\tR1 C3\nR2 C2\tR2 C3'
                }
            };
            this.grid.eventLoop.fire(e);
        }

        expectProperRanges(function expectPasteForRange(range) {
            var spy = spyOn(this.grid.dataModel, 'set');
            firePaste.call(this);
            var args = spy.calls.argsFor(0)[0];
            for (var r = range.top; r < range.top + range.height; r++) {
                for (var c = range.left; c < range.left + range.width; c++) {
                    expect(args).toContain({row: r, col: c, data: 'R' + r + ' C' + c, paste: true});
                }
            }

        });

    });

});