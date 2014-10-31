var mockEvent = require('@grid/custom-event');
var key = require('key');

describe('navigation-model', function () {
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var grid;
    var beforeEachFn = function (hRows, hCols) {
        grid = helper.buildSimpleGrid(undefined, undefined, undefined, undefined, undefined, undefined, hRows, hCols);
        model = grid.navigationModel;
    };


    function makeAndFireKeyDown(code, shiftKey) {
        var moveDown = mockEvent('keydown');
        moveDown.which = code;
        moveDown.shiftKey = shiftKey;
        grid.eventLoop.fire(moveDown);
    }


    function makeAndFireMouseDownForCell(r, c, shiftKey) {
        var mouseDown = mockEvent('mousedown');
        var col = c;
        var row = r;
        mouseDown.shiftKey = shiftKey;
        mouseDown.clientX = col * 100 + 1;
        mouseDown.clientY = row * 30 + 1;
        grid.eventLoop.fire(mouseDown);
    }

    function setMinMax(minR, minC, maxR, maxC) {
        model.minRow = minR;
        model.minCol = minC;
        model.maxRow = maxR;
        model.maxCol = maxC;
    }

    describe('focus', function () {
        var focus;
        beforeEach(function () {
            beforeEachFn();
            focus = model.focus;
        });

        function expectRowCol(r, c) {
            expect(focus).rowToBe(r);
            expect(focus).colToBe(c);
        }

        it('should start at 0, 0', function () {
            expectRowCol(0, 0);
        });

        it('should let me set it', function () {
            model.setFocus(2, 3);
            expectRowCol(2, 3);
        });

        it('should move around by one on keydowns', function () {
            makeAndFireKeyDown(key.code.arrow.down.code);
            expectRowCol(1, 0);
            makeAndFireKeyDown(key.code.arrow.right.code);
            expectRowCol(1, 1);
            makeAndFireKeyDown(key.code.arrow.up.code);
            expectRowCol(0, 1);
            makeAndFireKeyDown(key.code.arrow.left.code);
            expectRowCol(0, 0);
        });

        it('should register a cell class for focus', function () {
            var spy = spyOn(grid.cellClasses, 'add');
            require('@grid/navigation-model')(grid);
            expect(spy).toHaveBeenCalled();
            var descriptor = spy.argsForCall[0][0];
            expect(descriptor).unitsToBe('cell');
            expect(descriptor).spaceToBe('virtual');
            expect(descriptor).classToBe('focus');
        });

        describe('decorator', function () {
            var decorator;
            beforeEach(function () {
                decorator = model.focusDecorator;
            });
            it('should be added', function () {
                expect(grid.decorators.getAlive()).toContain(decorator);
            });

            it('should have a style class', function () {
                expect(decorator.render()).toHaveClass('grid-focus-decorator');
            });

            describe('should satisfy:', function () {
                var ctx = {helper: helper};
                beforeEach(function () {
                    ctx.decorator = decorator;
                });
                require('@grid/decorators/decorator-test-body')(ctx);
            });

            it('should move when focus changes', function () {
                model.setFocus(2, 3);
                expect(decorator).topToBe(2);
                expect(decorator).leftToBe(3);
            });
        });

        it('should move the cell class on navigation', function () {
            var spy = spyOn(grid.cellClasses, 'add');
            var model = require('@grid/navigation-model')(grid);
            expect(spy).toHaveBeenCalled();
            var descriptor = spy.argsForCall[0][0];
            model.setFocus(2, 3);
            expect(descriptor).topToBe(2);
            expect(descriptor).leftToBe(3);
        });


        it('should have a min and max row and col that it respects', function () {
            setMinMax(1, 1, 4, 3);
            model.setFocus(0, 0);
            expect(focus).rowToBe(1);
            expect(focus).colToBe(1);

            model.setFocus(10, 10);
            expect(focus).rowToBe(4);
            expect(focus).colToBe(3);
        });

        it('should reflect min on set', function () {
            model.setFocus(0, 0);
            model.minRow = 1;
            expect(focus).rowToBe(1);
            model.minCol = 1;
            expect(focus).colToBe(1);
        });

        it('should reflect max on set', function () {
            model.setFocus(Infinity, Infinity);
            model.maxRow = 1;
            expect(focus).rowToBe(1);
            model.maxCol = 1;
            expect(focus).colToBe(1);
        });

        it('should try to scroll the cell into view on nav', function () {
            var spy = spyOn(grid.cellScrollModel, 'scrollIntoView');
            model.setFocus(1, 1);
            expect(spy).toHaveBeenCalledWith(1, 1);
        });

        it('should navigate on mousedown', function () {
            var mouseDown = mockEvent('mousedown');
            var col = 3;
            var row = 4;
            mouseDown.clientX = col * 100 + 1;
            mouseDown.clientY = row * 30 + 1;
            grid.eventLoop.fire(mouseDown);
            expect(focus).rowToBe(row);
            expect(focus).colToBe(col);
        });

        it('should reflect min and max on mousedown', function () {
            model.setFocus(2, 3);
            setMinMax(1, 1, 4, 4);
            makeAndFireMouseDownForCell(0, 0);
            expect(focus).rowToBe(2);
            expect(focus).colToBe(3);
            makeAndFireMouseDownForCell(5, 5);
            expect(focus).rowToBe(2);
            expect(focus).colToBe(3);
        });
    });

    describe('selection', function () {
        var selection;
        beforeEach(function () {
            beforeEachFn();
            selection = model.selection;
        });

        describe('should satisfy:', function () {
            var ctx = {helper: helper};
            beforeEach(function () {
                ctx.decorator = selection;
            });
            require('@grid/decorators/decorator-test-body')(ctx);
        });

        it('adds style class to rendered elem', function () {
            expect(selection.render()).toHaveClass('grid-selection');
        });

        it('should be added as a decorator', function () {
            expect(grid.decorators.getAlive()).toContain(selection);
        });

        function selectCells(sr, sc, er, ec, dontSetFocus) {
            if (!dontSetFocus) {
                model.setFocus(sr, sc); //simulate the mousedown effect
            }
            var dragStart = {type: 'grid-drag-start', row: sr, col: sc};
            grid.eventLoop.fire(dragStart);
            var drag = {type: 'grid-cell-drag', row: er, col: ec};
            grid.eventLoop.fire(drag);
        }

        it('should default to all -1', function () {
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should select a range of cells on grid drag', function () {
            model.setFocus(1, 2);
            selectCells(1, 2, 3, 4);
            expect(selection).toBeRange(1, 2, 3, 3);
        });

        it('should expand the selection from focus even if that isnt the initial mousedown', function () {
            selectCells(1, 2, 3, 4, true);
            expect(selection).toBeRange(0, 0, 4, 5);
        });

        it('should not select if drag begins out of max min', function () {
            setMinMax(1, 1, 4, 4);
            selectCells(0, 0, 3, 3);
            expect(selection).toBeRange(-1, -1, -1, -1);
            selectCells(5, 5, 3, 3);
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('selection should clamp to min max', function () {
            setMinMax(1, 1, 4, 4);
            selectCells(1, 1, 0, 0);
            expect(selection).toBeRange(1, 1, 1, 1);
            selectCells(1, 1, 5, 5);
            expect(selection).toBeRange(1, 1, 4, 4);
        });

        it('should unbind on drag end', function () {
            var dragStart = {type: 'grid-drag-start', row: 1, col: 2};
            var unbind = helper.spyOnUnbind();
            selection._onDragStart(dragStart);
            var drag = {type: 'grid-cell-drag', row: 3, col: 4};
            grid.eventLoop.fire(drag);
            var dragEnd = {type: 'grid-drag-end', row: 2, col: 3};
            grid.eventLoop.fire(dragEnd);
            expect(unbind).toHaveBeenCalled();
            expect(unbind.callCount).toBe(2);
        });

        it('should clear on mousedown', function () {
            selectCells(1, 2, 3, 4);
            grid.eventLoop.fire(mockEvent('mousedown'));
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should clear key nav if shift is not down', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireKeyDown(key.code.arrow.down.code);
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should set on mousedown if shift is held', function () {
            makeAndFireMouseDownForCell(2, 2, true);
            expect(selection).toBeRange(0, 0, 3, 3);
        });

        it('should not set on mousedown out of min max range if shift is held', function () {
            model.setFocus(1, 1);
            setMinMax(1, 1, 4, 4);
            makeAndFireMouseDownForCell(0, 0, true);
            expect(selection).toBeRange(-1, -1, -1, -1);
            makeAndFireMouseDownForCell(5, 5, true);
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should expand and shrink selection on key nav', function () {
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(selection).toBeRange(0, 0, 2, 1);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            expect(selection).toBeRange(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(selection).toBeRange(0, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            //when its back to one it should be nothin
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should expand and shrink selection on key nav up', function () {
            model.setFocus(1, 1);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(selection).toBeRange(0, 1, 2, 1);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            expect(selection).toBeRange(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(selection).toBeRange(1, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            //when its back to one it should be nothin
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

        it('should not select merely on shift key down', function () {
            makeAndFireKeyDown(key.code.special.shift, true);
            expect(selection).toBeRange(-1, -1, -1, -1);
        });

    });

    describe('headers', function () {
        beforeEach(function () {
            beforeEachFn(1, 1);
        });
        //row col selection
        it('should select a whole col on header mousedown', function () {
            makeAndFireMouseDownForCell(0, 3, true);
            expect(grid.colModel.getSelected()).toEqual([2]);
        });

        it('should select a whole row on header mousedown', function () {
            makeAndFireMouseDownForCell(3, 0, true);
            expect(grid.rowModel.getSelected()).toEqual([2]);
        });
    });

});