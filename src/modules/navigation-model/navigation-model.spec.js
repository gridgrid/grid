var mockEvent = require('../custom-event');
var key = require('key');

describe('navigation-model', function () {
    require('../grid-spec-helper')();
    var model;
    var grid;
    var beforeEachFn = function (hRows, hCols) {
        grid = this.buildSimpleGrid(undefined, undefined, undefined, undefined, undefined, undefined, hRows, hCols);
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

    describe('focus', function () {
        var focus;
        beforeEach(function () {
            beforeEachFn.call(this);
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
            require('../navigation-model')(grid);
            expect(spy).toHaveBeenCalled();
            var descriptor = spy.calls.argsFor(0)[0];
            expect(descriptor).unitsToBe('cell');
            expect(descriptor).spaceToBe('data');
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
                var ctx = {};
                beforeEach(function () {
                    ctx.decorator = decorator;
                });
                require('../decorators/decorator-test-body')(ctx);
            });

            it('should move when focus changes', function () {
                model.setFocus(2, 3);
                expect(decorator).topToBe(2);
                expect(decorator).leftToBe(3);
            });
        });

        it('should move the cell class on navigation', function () {
            var spy = spyOn(grid.cellClasses, 'add');
            var model = require('../navigation-model')(grid);
            expect(spy).toHaveBeenCalled();
            var descriptor = spy.calls.argsFor(0)[0];
            model.setFocus(2, 3);
            expect(descriptor).topToBe(2);
            expect(descriptor).leftToBe(3);
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
    });


    function selectCells(sr, sc, er, ec, dontSetFocus) {

        var dragStart = {type: 'grid-drag-start'};
        dragStart.clientX = sc * 100 + 1;
        dragStart.clientY = sr * 30 + 1;
        grid.cellMouseModel._annotateEventInternal(dragStart);
        if (!dontSetFocus) {
            model.setFocus(dragStart.row, dragStart.col); //simulate the mousedown effect
        }
        grid.eventLoop.fire(dragStart);
        var drag = {type: 'grid-cell-drag'};
        drag.clientX = ec * 100 + 1;
        drag.clientY = er * 30 + 1;
        grid.cellMouseModel._annotateEventInternal(drag);
        grid.eventLoop.fire(drag);
    }

    describe('selection', function () {
        var selection;
        beforeEach(function () {
            beforeEachFn.call(this);
            selection = model.selection;
        });

        describe('should satisfy:', function () {
            var ctx = {};
            beforeEach(function () {
                ctx.decorator = selection;
            });
            require('../decorators/decorator-test-body')(ctx);
        });

        it('adds style class to rendered elem', function () {
            expect(selection.render()).toHaveClass('grid-selection');
        });

        it('should be added as a decorator', function () {
            expect(grid.decorators.getAlive()).toContain(selection);
        });

        it('should have the right defaults', function () {
            expect(selection).spaceToBe('data');
            expect(selection).unitsToBe('cell');
        });

        it('should default to all -1', function () {
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

        it('should select a range of cells on grid drag', function () {
            model.setFocus(1, 2);
            selectCells(1, 2, 3, 4);
            expect(selection).rangeToBe(1, 2, 3, 3);
        });

        it('should expand the selection from focus even if that isnt the initial mousedown', function () {
            selectCells(1, 2, 3, 4, true);
            expect(selection).rangeToBe(0, 0, 4, 5);
        });

        it('should unbind on drag end', function () {
            var dragStart = {type: 'grid-drag-start', row: 1, col: 2};
            var unbind = this.spyOnUnbind();
            selection._onDragStart(dragStart);
            var drag = {type: 'grid-cell-drag', row: 3, col: 4};
            grid.eventLoop.fire(drag);
            var dragEnd = {type: 'grid-drag-end', row: 2, col: 3};
            grid.eventLoop.fire(dragEnd);
            expect(unbind).toHaveBeenCalled();
            expect(unbind.calls.count()).toBe(2);
        });

        it('should clear on mousedown', function () {
            selectCells(1, 2, 3, 4);
            grid.eventLoop.fire(mockEvent('mousedown'));
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

        it('should clear key nav if shift is not down', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireKeyDown(key.code.arrow.down.code);
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

        it('should set on mousedown if shift is held', function () {
            makeAndFireMouseDownForCell(2, 2, true);
            expect(selection).rangeToBe(0, 0, 3, 3);
        });

        it('should expand and shrink selection on key nav', function () {
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(selection).rangeToBe(0, 0, 2, 1);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            expect(selection).rangeToBe(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(selection).rangeToBe(0, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            //when its back to one it should be nothin
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

        it('should expand and shrink selection on key nav up', function () {
            model.setFocus(1, 1);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(selection).rangeToBe(0, 1, 2, 1);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            expect(selection).rangeToBe(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(selection).rangeToBe(1, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            //when its back to one it should be nothin
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

        it('should not select merely on shift key down', function () {
            makeAndFireKeyDown(key.code.special.shift, true);
            expect(selection).rangeToBe(-1, -1, -1, -1);
        });

    });

    describe('headers / col row selection', function () {
        beforeEach(function () {
            beforeEachFn.call(this, 1, 1);
        });
        //row col selection
        it('should toggle select a whole col on header mousedown', function () {
            makeAndFireMouseDownForCell(0, 3, true);
            expect(grid.colModel.getSelected()).toEqual([2]);
            makeAndFireMouseDownForCell(0, 3, true);
            expect(grid.colModel.getSelected()).toEqual([]);
        });

        it('should toggle select a whole row on header mousedown', function () {
            makeAndFireMouseDownForCell(3, 0, true);
            expect(grid.rowModel.getSelected()).toEqual([2]);
            grid.cellScrollModel.scrollTo(0, 0);

            makeAndFireMouseDownForCell(3, 0, true);
            expect(grid.rowModel.getSelected()).toEqual([]);
        });

        it('should set a cell class for a selected row', function () {
            var spy = spyOn(grid.cellClasses, 'add');
            grid.rowModel.select(0);
            expect(spy).toHaveBeenCalled();
            var decorator = spy.calls.argsFor(0)[0];
            expect(decorator).unitsToBe('cell');
            expect(decorator).spaceToBe('virtual');
            expect(decorator).rangeToBe(1, 0, 1, 1);
            expect(decorator).classToBe('selected');
        });

        it('should not duplicate decorators for row select', function () {
            grid.rowModel.select(0);
            var spy = spyOn(grid.cellClasses, 'add');
            grid.rowModel.select(1);
            expect(spy.calls.count()).toBe(2);
            expect(model._rowSelectionClasses.length).toBe(2);
        });

        it('should set a cell class for a selected col', function () {
            var spy = spyOn(grid.cellClasses, 'add');
            grid.colModel.select(0);
            expect(spy).toHaveBeenCalled();
            var decorator = spy.calls.argsFor(0)[0];
            expect(decorator).unitsToBe('cell');
            expect(decorator).spaceToBe('virtual');
            expect(decorator).rangeToBe(0, 1, 1, 1);
            expect(decorator).classToBe('selected');
        });

        it('should not duplicate decorators for col select', function () {
            grid.colModel.select(0);
            var spy = spyOn(grid.cellClasses, 'add');
            grid.colModel.select(1);
            expect(spy.calls.count()).toBe(2);
            expect(model._colSelectionClasses.length).toBe(2);
        });

        it('focus should ignore headers on mousedown', function () {
            model.setFocus(2, 3);
            makeAndFireMouseDownForCell(0, 0);
            expect(model.focus).rowToBe(2);
            expect(model.focus).colToBe(3);
        });


        it('should not select if drag begins in headers', function () {
            selectCells(0, 0, 3, 3);
            expect(model.selection).rangeToBe(-1, -1, -1, -1);
        });


        it('should not set on mousedown on headers even if shift is held', function () {
            model.setFocus(1, 1);
            makeAndFireMouseDownForCell(0, 0, true);
            expect(model.selection).rangeToBe(-1, -1, -1, -1);
        });


        it('selection should clamp to data range', function () {
            selectCells(1, 1, 0, 0);
            expect(model.selection).rangeToBe(0, 0, 1, 1);
        });
    });

});