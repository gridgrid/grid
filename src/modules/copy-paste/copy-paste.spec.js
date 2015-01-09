(function () {
    var mockEvent = require('../custom-event');
    var key = require('key');
    ddescribe('copy-paste', function () {


        require('../grid-spec-helper')();
        beforeEach(function () {
            this.buildSimpleGrid();
            jasmine.addMatchers({
                toHaveBeenCalledWithAllPointsInRange: function () {
                    return {
                        compare: function (spy, range) {
                            var allArgs = spy.calls.allArgs();
                            var fails = [];
                            for (var r = range.top; r <= range.top + range.height; r++) {
                                for (var c = range.left; c <= range.left + range.width; c++) {
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
            })
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
                var spy = spyOn(this.grid.dataModel, 'getCopyData');
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

            xit('should put copy data into text area as tab delimitted csv', function () {
                this.viewBuild(); //to get the textarea
                var selectionRange = {top: 1, left: 2, width: 1, height: 2};
                this.grid.navigationModel.setSelection(selectionRange);
                fireCopy.call(this);
                expect(this.grid.textarea.value).toEqual('blah')
            });
        });

        describe('paste', function () {

        });

    });
})();