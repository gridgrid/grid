var mockEvent = require('../custom-event');
var key = require('key');

describe('navigation-model', function () {
    require('../grid-spec-helper')();
    var model;
    var grid;
    var beforeEachFn = function (hRows, hCols, nRows, nCols) {
        grid = this.buildSimpleGrid(nRows, nCols, undefined, undefined, undefined, undefined, hRows, hCols);
        model = grid.navigationModel;
        grid.focused = true;
    };


    function makeAndFireKeyDown(code, shiftKey) {
        var moveDown = mockEvent('keydown');
        moveDown.which = code;
        moveDown.shiftKey = shiftKey;
        grid.eventLoop.fire(moveDown);
    }

    function makeAndFireMouseDownForCell(r, c, shiftKey, metaKey) {
        var mousedown = mockEvent('mousedown');
        var col = c;
        var row = r;
        mousedown.shiftKey = shiftKey;
        mousedown.metaKey = metaKey;
        mousedown.clientX = col * 100 + 2;
        mousedown.clientY = row * 30 + 2;
        grid.eventLoop.fire(mousedown);
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
            mouseDown.clientX = col * 100 + 2;
            mouseDown.clientY = row * 30 + 2;
            grid.eventLoop.fire(mouseDown);
            expect(focus).rowToBe(row);
            expect(focus).colToBe(col);
        });

        it('should fire an event on focus changes', function () {
            var spy = jasmine.createSpy('focusListener');
            grid.eventLoop.bind('grid-focus-change', spy);
            model.setFocus(1, 1);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('navFrom', function () {


        describe('seek behavior', function () {

            beforeEach(function () {
                beforeEachFn.call(this, undefined, undefined, 11, 11);
            });

            function getCoordFromPoint(rowOrCol, coord, amount) {
                coord[rowOrCol] += amount;
                return coord;
            }

            function getCoordFromCenter(rowOrCol, amount) {
                var coord = {
                    row: 5,
                    col: 5
                };

                return getCoordFromPoint(rowOrCol, coord, amount);
            }

            function testSeek(rowOrCol, direction, directionCode, backCode) {
                var forwardEvent = {
                    which: directionCode,
                    metaKey: true
                };
                var backwardEvent = {
                    which: backCode,
                    metaKey: true
                };
                var firstExpect = getCoordFromCenter(rowOrCol, direction);
                var secondExpect = getCoordFromCenter(rowOrCol, direction * 4);
                var finalExpect = getCoordFromCenter(rowOrCol, direction * 5);

                // test contiguous data
                // start at the center of the grid and seek; should go all the way to the edge of the grid
                expect(model._navFrom(5, 5, forwardEvent)).toEqual(finalExpect);

                // non-contiguous data
                // start at the center of the grid and seek; should stop at the edges of the data
                var firstEmpty = getCoordFromCenter(rowOrCol, direction * 2);
                firstEmpty.formatted = '';
                var secondEmpty = getCoordFromCenter(rowOrCol, direction * 3);
                secondEmpty.formatted = '';
                var thirdEmpty = getCoordFromCenter(rowOrCol, direction * 5);
                thirdEmpty.formatted = '';
                this.grid.dataModel.set([firstEmpty, secondEmpty, thirdEmpty]);

                expect(model._navFrom(5, 5, forwardEvent)).toEqual(firstExpect);
                expect(model._navFrom(firstExpect.row, firstExpect.col, forwardEvent)).toEqual(secondExpect);
                expect(model._navFrom(secondExpect.row, secondExpect.col, forwardEvent)).toEqual(finalExpect);
                expect(model._navFrom(finalExpect.row, finalExpect.col, backwardEvent)).toEqual(secondExpect);
                expect(model._navFrom(secondExpect.row, secondExpect.col, backwardEvent)).toEqual(firstExpect);
            }

            it('should seek the edge of the data left', function () {
                testSeek.call(this, 'col', -1, key.code.arrow.left.code, key.code.arrow.right.code);
            });

            it('should seek the edge of the data right', function () {
                testSeek.call(this, 'col', 1, key.code.arrow.right.code, key.code.arrow.left.code);
            });

            it('should seek the edge of the data up', function () {
                testSeek.call(this, 'row', -1, key.code.arrow.up.code, key.code.arrow.down.code);
            });

            it('should seek the edge of the data down', function () {
                testSeek.call(this, 'row', 1, key.code.arrow.down.code, key.code.arrow.up.code);
            });
        });
    });

    function selectCells(sr, sc, er, ec, dontSetFocus) {

        var dragStart = {
            type: 'grid-drag-start'
        };
        dragStart.clientX = sc * 100 + 2;
        dragStart.clientY = sr * 30 + 2;
        grid.cellMouseModel._annotateEventInternal(dragStart);
        if (!dontSetFocus) {
            model.setFocus(dragStart.row, dragStart.col); //simulate the mousedown effect
        }
        grid.eventLoop.fire(dragStart);
        var drag = {
            type: 'grid-cell-drag'
        };
        drag.clientX = ec * 100 + 2;
        drag.clientY = er * 30 + 2;
        grid.cellMouseModel._annotateEventInternal(drag);
        grid.eventLoop.fire(drag);
    }

    describe('selection', function () {
        beforeEach(function () {
            beforeEachFn.call(this);
        });

        describe('decorator', function () {
            var ctx = {};
            beforeEach(function () {
                ctx.decorator = model._selectionDecorator;
            });
            require('../decorators/decorator-test-body')(ctx);

            it('adds style class to rendered elem', function () {
                expect(ctx.decorator.render()).toHaveClass('grid-selection');
            });

            it('should be added as a decorator', function () {
                expect(grid.decorators.getAlive()).toContain(ctx.decorator);
            });

            it('should have the right defaults', function () {
                expect(ctx.decorator).spaceToBe('data');
                expect(ctx.decorator).unitsToBe('cell');
            });

            it('should unbind on drag end', function () {
                var dragStart = {
                    type: 'grid-drag-start',
                    row: 1,
                    col: 2
                };
                var unbind = this.spyOnUnbind();
                ctx.decorator._onDragStart(dragStart);
                var drag = {
                    type: 'grid-cell-drag',
                    row: 3,
                    col: 4
                };
                grid.eventLoop.fire(drag);
                var dragEnd = {
                    type: 'grid-drag-end',
                    row: 2,
                    col: 3
                };
                grid.eventLoop.fire(dragEnd);
                expect(unbind).toHaveBeenCalled();
                expect(unbind.calls.count()).toBe(2);
            });
        });


        it('should default to the focus', function () {
            expect(model.selection).rangeToBe(0, 0, 1, 1);
        });

        it('should select a range of cells on grid drag', function () {
            model.setFocus(1, 2);
            selectCells(1, 2, 3, 4);
            expect(model.selection).rangeToBe(1, 2, 3, 3);
        });

        it('should expand the selection from focus even if that isnt the initial mousedown', function () {
            selectCells(1, 2, 3, 4, true);
            expect(model.selection).rangeToBe(0, 0, 4, 5);
        });

        it('should clear on mousedown', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireMouseDownForCell(2, 2, false);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
        });

        it('should add to a list of selections on mousedown with ctrl/cmd', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireMouseDownForCell(2, 2, false, true);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
            expect(model.otherSelections[0]).rangeToBe(1, 2, 3, 3);
        });

        it('should not add to a list of selections on mousedown with ctrl/cmd and shift', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireMouseDownForCell(2, 2, true, true);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 2, 1);
            expect(model.otherSelections).toEqual([]);
        });

        it('should clear others on mousedown', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireMouseDownForCell(2, 2, false, true);
            var oldSelections = model.otherSelections;
            makeAndFireMouseDownForCell(2, 2, false, false);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
            expect(model.otherSelections).toEqual([]);
            expect(this.grid.decorators.getAlive()).not.toContain(oldSelections[0]);
        });

        it('should clear key nav if shift is not down', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireKeyDown(key.code.arrow.down.code);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
        });

        it('should set on mousedown if shift is held', function () {
            makeAndFireMouseDownForCell(2, 2, true);
            expect(model.selection).rangeToBe(0, 0, 3, 3);
        });

        it('should clear other selections on mousedown even with shift', function () {
            selectCells(1, 2, 3, 4);
            makeAndFireMouseDownForCell(2, 2, false, true);
            var oldSelections = model.otherSelections;

            makeAndFireMouseDownForCell(2, 2, true, false);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
            expect(model.otherSelections).toEqual([]);
            expect(this.grid.decorators.getAlive()).not.toContain(oldSelections[0]);
        });

        it('should expand and shrink selection on key nav', function () {
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(model.selection).rangeToBe(0, 0, 2, 1);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            expect(model.selection).rangeToBe(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(model.selection).rangeToBe(0, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            //when its back to one it should be nothin
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
        });

        it('should expand and shrink selection on key nav up', function () {
            model.setFocus(1, 1);
            makeAndFireKeyDown(key.code.arrow.up.code, true);
            expect(model.selection).rangeToBe(0, 1, 2, 1);
            makeAndFireKeyDown(key.code.arrow.left.code, true);
            expect(model.selection).rangeToBe(0, 0, 2, 2);
            makeAndFireKeyDown(key.code.arrow.down.code, true);
            expect(model.selection).rangeToBe(1, 0, 1, 2);
            makeAndFireKeyDown(key.code.arrow.right.code, true);
            //when its back to one it should be nothin

            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
        });

        it('should not select merely on shift key down', function () {
            makeAndFireKeyDown(key.code.special.shift, true);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
        });

        it('should clear on move event', function () {
            model.setSelection({
                top: 1,
                left: 1,
                width: 2,
                height: 2
            });
            model.otherSelections.push({
                top: 3,
                left: 4,
                width: 2,
                height: 2
            });
            grid.colModel.move(1, 2);
            expect(model.selection).rangeToBe(model.focus.row, model.focus.col, 1, 1);
            expect(model.otherSelections).toEqual([]);
        });

    });

    describe('headers / col row selection', function () {
        beforeEach(function () {
            beforeEachFn.call(this, 1, 1);
        });
        //row col selection
        it('should select a whole col on header mousedown', function () {
            makeAndFireMouseDownForCell(0, 3);
            expect(grid.colModel.getSelected()).toEqual([2]);
        });


        it('should select a whole row on header mousedown', function () {
            makeAndFireMouseDownForCell(3, 0);
            expect(grid.rowModel.getSelected()).toEqual([2]);
        });

        it('should clear other selections on mousedown', function () {
            makeAndFireMouseDownForCell(3, 0);
            expect(grid.rowModel.getSelected()).toEqual([2]);
            makeAndFireMouseDownForCell(4, 0);
            expect(grid.rowModel.getSelected()).toEqual([3]);
        });

        it('should add to the selection on mousedown if ctrl cmd held', function () {
            makeAndFireMouseDownForCell(3, 0);
            expect(grid.rowModel.getSelected()).toEqual([2]);
            makeAndFireMouseDownForCell(4, 0, false, true);
            expect(grid.rowModel.getSelected()).toContain(2);
            expect(grid.rowModel.getSelected()).toContain(3);
        });

        it('should select a range on shift click', function () {
            makeAndFireMouseDownForCell(3, 0);
            makeAndFireMouseDownForCell(5, 0, true);
            expect(grid.rowModel.getSelected()).toEqual([2, 3, 4]);
        });

        it('should set a cell classes for a selected row', function (cb) {
            var spy = spyOn(grid.cellClasses, 'add');
            grid.rowModel.select(0);
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                var cellClass1 = spy.calls.argsFor(0)[0];
                var cellClass2 = spy.calls.argsFor(1)[0];
                expect(cellClass1).unitsToBe('cell');
                expect(cellClass2).unitsToBe('cell');
                expect(cellClass1).spaceToBe('data');
                expect(cellClass2).spaceToBe('virtual');
                expect(cellClass1).rangeToBe(0, -1, 1, 1);
                expect(cellClass2).rangeToBe(1, 0, 1, 1);
                expect(cellClass1).classToBe('grid-col-drag-ready');
                expect(cellClass2).classToBe('selected');
                cb();
            }, 2);

        });

        it('should not duplicate cell classes for row select', function (cb) {
            grid.rowModel.select(0);
            var spy = spyOn(grid.cellClasses, 'add');
            grid.rowModel.select(1);
            setTimeout(function () {
                expect(spy.calls.count()).toBe(3);
                expect(model._rowSelectionClasses.length).toBe(2);
                cb();
            }, 2);
        });

        it('should set a cell class for a selected col', function (cb) {
            var spy = spyOn(grid.cellClasses, 'add');
            grid.colModel.select(0);
            setTimeout(function () {
                expect(spy).toHaveBeenCalled();
                var cellClass1 = spy.calls.argsFor(0)[0];
                var cellClass2 = spy.calls.argsFor(1)[0];
                expect(cellClass1).unitsToBe('cell');
                expect(cellClass2).unitsToBe('cell');
                expect(cellClass1).spaceToBe('data');
                expect(cellClass2).spaceToBe('virtual');
                expect(cellClass1).rangeToBe(-1, 0, 1, 1);
                expect(cellClass2).rangeToBe(0, 1, 1, 1);
                expect(cellClass1).classToBe('grid-col-drag-ready');
                expect(cellClass2).classToBe('selected');
                cb();
            }, 2);

        });

        it('should not duplicate cell classes for col select', function (cb) {
            grid.colModel.select(0);
            var spy = spyOn(grid.cellClasses, 'add');
            grid.colModel.select(1);
            setTimeout(function () {
                expect(spy.calls.count()).toBe(3);
                expect(model._colSelectionClasses.length).toBe(2);
                cb();
            }, 2);

        });

        it('selection should clamp to data range', function () {
            selectCells(2, 2, 0, 0);
            expect(model.selection).rangeToBe(0, 0, 2, 2);
        });

    });

});
