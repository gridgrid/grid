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

    describe('copy', function () {
        function fireCopy() {
            var e = mockEvent('keydown');
            e.which = key.code.alnum.c;
            e.metaKey = true;
            this.grid.eventLoop.fire(e);
        }

        function expectCopyDataForRange(selectionRange) {
            var spy = spyOn(this.grid.dataModel, 'getCopyData').and.callThrough();
            fireCopy.call(this);
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWithAllPointsInRange(selectionRange);
        }

        it('should get the copy data for the selected range', function () {
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            expectCopyDataForRange.call(this, selectionRange);
        });

        it('should get the copy data for the focus range if no selection', function () {
            this.grid.navigationModel.setFocus(1, 1);
            expectCopyDataForRange.call(this, {top: 1, left: 1, width: 1, height: 1});
        });

        it('should prefer the selection to the focus', function () {
            this.grid.navigationModel.setFocus(1, 1);
            var selectionRange = {top: 1, left: 2, width: 1, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);

            expectCopyDataForRange.call(this, selectionRange);
        });

        it('should put copy data into text area as tab delimitted csv', function () {
            var selectionRange = {top: 1, left: 2, width: 2, height: 2};
            this.grid.navigationModel.setSelection(selectionRange);
            fireCopy.call(this);
            expect(this.grid.textarea.value).toEqual('r1 c2\tr1 c3\nr2 c2\tr2 c3')
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
        function firePasteKeyDown() {
            var e = mockEvent('keydown');
            e.which = key.code.alnum.v;
            e.metaKey = true;
            this.grid.eventLoop.fire(e);
        }

        function firePaste() {
            var e = mockEvent('paste');
            this.grid.eventLoop.fire(e);
        }


    });

});