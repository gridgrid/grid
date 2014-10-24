describe('view-layer', function () {

    var helper = require('@grid/grid-spec-helper')();
    var viewRows = 10;
    var viewCols = 10;
    var view;
    var grid;
    var $ = require('jQuery');
    var container;

    function viewBeforeEach(varyHeight, varyWidth, frows, fcols) {
        grid = helper.buildSimpleGrid(100, 20, varyHeight, varyWidth, frows, fcols);
        view = grid.viewLayer;
        //mock the view port
        grid.viewPort.sizeToContainer = function () {
        };
        grid.viewPort.rows = viewRows;
        grid.viewPort.cols = viewCols;
        container = helper.viewBuild();
    }

    beforeEach(function () {
        viewBeforeEach();
    });

    function findGridCells() {
        return $(container).find('[dts="grid-cell"]');
    }

    function findGridRows() {
        return $(container).find('[dts="grid-row"]');
    }

    function findCellContainer() {
        return $(container).find('[dts=grid-cells]');
    }

    it('should add a grid element to a supplied container', function () {
        expect(container.firstChild).toBeDefined();
    });

    it('should clear the container before building again', function () {
        view.build(container);
        expect(container.childElementCount).toBe(1);
    });


    it('should create a container for the cells', function () {
        var cellContainer = findCellContainer();
        expect(cellContainer.length).toBe(1);
        expect(cellContainer.hasClass('grid-cells')).toBe(true);
    });

    it('should position the cell container pinned with zindex 0', function () {
        var cellContainer = findCellContainer();
        expect(cellContainer).toBePositioned(0, 0, 0, 0);
        expect(cellContainer.css('zIndex')).toBe('0');
    });

    it('should create rows x cols cells', function () {
        view.draw();
        helper.onDraw(function () {
            var gridCells = findGridCells(container);
            expect(gridCells.length).toBe(viewCols * viewRows);
        });
    });

    it('should clear the cell container before rebuilding the cells', function () {
        view.draw();
        helper.onDraw(function () {
            var gridCells = findGridCells(container);
            expect(gridCells.length).toBe(viewCols * viewRows);
            view.draw();
        });
        helper.onDraw(function () {
            var gridCells = findGridCells(container);
            expect(gridCells.length).toBe(viewCols * viewRows);
        });
    });

    it('shouldnt call build cells if viewport isnt dirty', function () {
        helper.resetAllDirties();
        var spy = spyOn(view, '_buildCells');
        view.draw();
        helper.onDraw(function () {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    function expectRedraw(methods, thingToTriggerRedraw) {
        helper.resetAllDirties();
        var drawMethods = methods;
        var spies = drawMethods.map(function (method) {
            return spyOn(view, method);
        });
        thingToTriggerRedraw();
        helper.onDraw(function () {
            spies.forEach(function (spy) {
                expect(spy).toHaveBeenCalled();
            });
        });
    }

    it('should redraw everything if viewPort is dirty', function () {
        expectRedraw(['_buildCells', '_drawCells', '_drawCellClasses', '_drawDecorators'], function () {
            grid.viewPort.width = 1;
        });
    });

    it('should redraw everything if col model is dirty', function () {
        expectRedraw(['_drawCells', '_drawCellClasses', '_drawDecorators'], function () {
            grid.colModel.add({});
        });
    });

    it('should add style classes to the cell on draw', function () {
        view.draw();
        helper.onDraw(function () {
            expectOnlyRangeToHaveClass(0, 0, viewRows, viewCols, 'grid-cell');
        });
    });

    it('should wrap rows in a div', function () {
        view.draw();
        helper.onDraw(function () {
            var rows = findGridRows();
            expect(rows.length).toBe(viewRows);
            expect(rows.hasClass('grid-row'));
        });
    });

    it('should add a class to indicate the scroll top is odd', function () {
        grid.cellScrollModel.scrollTo(1, 0);
        helper.onDraw(function () {
            expect(findCellContainer()).toHaveClass('odds');
            grid.cellScrollModel.scrollTo(2, 0);
        });
        helper.onDraw(function () {
            expect(findCellContainer()).not.toHaveClass('odds');
        });
    });

    it('should be able to write values to cells', function () {
        view.draw();
        helper.onDraw(function () {
            expect(findGridCells(container).first().text()).toEqual('0-0');
        });
    });


    it('should set the height of rows on draw', function () {
        view.draw();
        helper.onDraw(function () {
            var rows = findGridRows();
            expect(rows.first().height()).toBe(31);
        });
    });

    it('should write widths and heights to the cells on draw', function () {
        view.draw();
        helper.onDraw(function () {
            //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders 
            expect(findGridCells(container).first().width()).toEqual(101);
            expect(findGridCells(container).first().height()).toEqual(31);
        });
    });

    it('should write widths and heights with extra border width', function () {
        var styleOverride = document.createElement('style');
        styleOverride.innerHTML = '.grid-cell{border : 2px solid black;}';
        document.body.appendChild(styleOverride);
        container = helper.viewBuild();
        view.draw();
        helper.onDraw(function () {
            document.body.removeChild(styleOverride);
            //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders 
            expect(findGridCells(container).first().width()).toEqual(102);
            expect(findGridCells(container).first().height()).toEqual(32);
        });

    });

    function findColCellByIndex(index) {
        return $(findGridCells(container)[index]);
    }

    function findRowCellByIndex(index) {
        return $(findGridCells(container)[index * viewCols]);
    }

    function findCellByRowCol(r, c) {
        return $(findGridCells(container)[r * viewCols + c]);
    }

    function expectOnlyRangeToHaveClass(t, l, h, w, cellClass) {
        for (var r = 0; r < viewRows; r++) {
            for (var c = 0; c < viewCols; c++) {
                var cell = findCellByRowCol(r, c);
                var expectCell = expect(cell);
                if (r < t || r >= t + h || c < l || c >= l + w) {
                    expectCell.not.toHaveClass(cellClass);
                } else {
                    expectCell.toHaveClass(cellClass);
                }

            }
        }
    }


    it('should write varied widths and heights', function () {
        viewBeforeEach([20, 30, 40], [99, 100, 101]);
        view.draw();
        helper.onDraw(function () {
            //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders 
            expect(findColCellByIndex(0).width()).toEqual(100);
            expect(findColCellByIndex(1).width()).toEqual(101);
            expect(findColCellByIndex(2).width()).toEqual(102);
            expect(findRowCellByIndex(0).height()).toEqual(21);
            expect(findRowCellByIndex(1).height()).toEqual(31);
            expect(findRowCellByIndex(2).height()).toEqual(41);
        });
    });

    function expectFirstCellText(text) {
        expect(findGridCells(container).first().text()).toEqual(text);
    }

    it('should write offset values to the cells if scrolled', function () {
        grid.cellScrollModel.scrollTo(5, 6);
        helper.onDraw(function () {
            expectFirstCellText('5-6');
        });
    });

    it('shouldnt call draw cells if cell scroll model isnt dirty', function () {

        helper.resetAllDirties();
        var spy = spyOn(view, '_drawCells');
        view.draw();
        helper.onDraw(function () {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should position the cells in a grid', function () {
        view.draw();
        helper.onDraw(function () {
            //the row does the vertical positioning so we have to check the top value of offset and left value of position
            expect(findGridCells(container).last().offset().top).toEqual(30 * (viewRows - 1));
            expect(findGridCells(container).last().position().left).toEqual(100 * (viewCols - 1));
        });
    });

    function expectFirstAndSecondCell(firstCellWidth) {
        var cells = findGridCells(container);
        expect(cells.first().position()).toEqual({
            top: 0,
            left: 0
        });

        expect(cells.first().width()).toBe(firstCellWidth);
        expect($(cells[1]).position()).toEqual({top: 0, left: firstCellWidth - 1});
    }

    it('should position varied width and height cells on scroll', function () {
        viewBeforeEach([20, 30, 40], [99, 100, 101]);
        view.draw();
        helper.onDraw(function () {
            expectFirstAndSecondCell(100);
            grid.cellScrollModel.scrollTo(1, 1);
        });

        helper.onDraw(function () {
            expectFirstAndSecondCell(101);
        });
    });

    it('should notify on draw', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-draw', spy);
        view.draw();
        helper.onDraw(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should remove all grid elements on destroy', function () {
        view.destroy();
        expect(container.children.length).toBe(0);
    });

    function makeDivDecorator() {
        var decDiv = document.createElement('div');
        var decorator = grid.decorators.create();

        decorator.render = function () {
            return decDiv;
        };
        decorator.getDiv = function () {
            return decDiv;
        };
        return decorator;
    }

    describe('decorators', function () {
        var decorator;
        beforeEach(function () {
            decorator = makeDivDecorator();
        });

        it('should draw only when dirty', function () {
            var spy = spyOn(view, '_drawDecorators'); //treat this as the test that its going to draw
            grid.decorators.add(decorator);
            helper.onDraw(function () {
                expect(spy).toHaveBeenCalled();
                spy.reset();
                grid.viewLayer.draw();
            });

            helper.onDraw(function () {
                expect(spy).not.toHaveBeenCalled();
            });
        });

        it('should have a container after the cell container', function () {
            var decoratorContainer = $(container).find('[dts="grid-decorators"]');
            expect(decoratorContainer.length).toBe(1);
            expect(decoratorContainer.prevAll('[dts=grid-cells]').length).toBe(1);
        });

        it('should be positioned pinned to the edges with zindex', function () {
            var decoratorContainer = $(container).find('[dts="grid-decorators"]');
            expect(decoratorContainer).toBePositioned(0, 0, 0, 0);
            expect(decoratorContainer.css('zIndex')).toBe('0');
        });

        it('should render a decorator into a container with pointer events none', function () {
            grid.decorators.add(decorator);
            helper.onDraw(function () {
                expect(decorator.getDiv().parentElement).toBeTruthy();
                expect($(decorator.getDiv()).parents('[dts=grid-decorators]').length).toBe(1);
                expect(decorator.boundingBox.style.pointerEvents).toBe('none');
            });
        });

        function expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy) {
            expect(spy).toHaveBeenCalled();
            var boundingBox = decorator.getDiv().parentElement;
            expect(boundingBox.parentElement).toBeFalsy();
            expect(decorator.boundingBox).toBeFalsy();
        }

        it('should receive a destroy event when the grid is cleaned up and not be in the dom', function () {
            var spy = jasmine.createSpy();
            decorator.getDiv().addEventListener('decorator-destroy', spy);
            grid.decorators.add(decorator);
            helper.onDraw(function () {
                view.destroy();
                expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
            });
        });

        it('should destroy dead decorators on draw', function () {
            var spy = jasmine.createSpy();
            decorator.getDiv().addEventListener('decorator-destroy', spy);
            grid.decorators.add(decorator);
            helper.onDraw(function () {
                grid.decorators.remove(decorator); //remove implicitly calls draw
            });
            helper.onDraw(function () {
                expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
            });

        });

        function setDecoratorPosition(top, left, height, width) {
            decorator.top = top;
            decorator.left = left;
            decorator.height = height;
            decorator.width = width;
        }

        function expectBoundingBoxSize(top, left, height, width, nextFn) {
            helper.onDraw(function () {
                var $boundingBox = $(decorator.boundingBox);
                expect($boundingBox.position().top).toBe(top);
                expect($boundingBox.position().left).toBe(left);
                expect($boundingBox.height()).toBe(height);
                expect($boundingBox.width()).toBe(width);
                expect(decorator.boundingBox.style.position).toEqual('absolute');
                if (nextFn) {
                    nextFn();
                }
            });
        }

        it('should position a virtual cell range decorator', function () {
            setDecoratorPosition(5, 6, 3, 3);
            grid.decorators.add(decorator);
            // the plus one is so it overlaps the borders
            expectBoundingBoxSize(5 * 30, 6 * 100, 3 * 30 + 1, 3 * 100 + 1);
        });

        it('should handle virtual cell ranges that are not in view', function () {
            setDecoratorPosition(1, 1, 1, 1);
            grid.cellScrollModel.scrollTo(2, 2);
            grid.decorators.add(decorator);

            helper.onDraw(function () {
                expect(decorator.boundingBox.style.width).toBe('0px');
                expect(decorator.boundingBox.style.height).toBe('0px');
            });
        });

        it('should handle virtual cell ranges that are not valid', function () {
            setDecoratorPosition(-1, -1, -1, -1);
            grid.decorators.add(decorator);

            helper.onDraw(function () {
                expect(decorator.boundingBox.style.width).toBe('0px');
                expect(decorator.boundingBox.style.height).toBe('0px');
            });
        });

        xit('should position a virtual pixel range decorator', function () {
            grid.cellScrollModel.scrollTo(1, 1);
            setDecoratorPosition(5, 6, 2, 3);
            decorator.units = 'px';
            grid.decorators.add(decorator);
            expectBoundingBoxSize(35, 106, 2, 3);
        });

        it('should position a real cell range decorator', function () {
            setDecoratorPosition(5, 6, 3, 3);
            decorator.space = 'real';
            grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
            grid.decorators.add(decorator);
            // the plus one is so it overlaps the borders
            expectBoundingBoxSize(5 * 30, 6 * 100, 3 * 30 + 1, 3 * 100 + 1);
        });

        it('should position a real pixel range decorator', function () {
            setDecoratorPosition(5, 6, 2, 4);
            decorator.units = 'px';
            decorator.space = 'real';
            grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5, 6, 2, 4);

        });

        it('should reposition if decorators box changes', function () {
            setDecoratorPosition(5, 6, 2, 3);
            decorator.units = 'px';
            decorator.space = 'real';
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5, 6, 2, 3, function next() {
                setDecoratorPosition(1, 6, 6, 3);
            });

            expectBoundingBoxSize(1, 6, 6, 3);
        });

        it('should reposition if decorators units changes', function () {
            setDecoratorPosition(5, 6, 2, 3);
            decorator.units = 'cell';
            decorator.space = 'real';
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5 * 30, 6 * 100, 2 * 30 + 1, 3 * 100 + 1, function next() {
                decorator.units = 'px';
            });

            expectBoundingBoxSize(5, 6, 2, 3);
        });

        it('should clamp a decorators height and width to the viewport', function () {
            setDecoratorPosition(5, 6, Infinity, Infinity);
            decorator.space = 'real';
            decorator.units = 'px';
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5, 6, grid.viewPort.height, grid.viewPort.width);
        });
        
        it('should reposition if scrolled or col dirty', function(){
            
        });
    });

    describe('fixed rows and cols', function () {
        it('should not move on scroll', function () {
            viewBeforeEach(false, false, 1, 0);
            grid.cellScrollModel.scrollTo(1, 0);
            helper.onDraw(function () {
                expectFirstCellText('0-0');
                viewBeforeEach(false, false, 0, 1);
                grid.cellScrollModel.scrollTo(0, 1);
            });

            helper.onDraw(function () {
                expectFirstCellText('0-0');
            });
        });

        it('should affect positioning of unfixed', function () {
            viewBeforeEach(false, false, 1, 0);
            grid.cellScrollModel.scrollTo(1, 0);
            helper.onDraw(function () {
                findGridCells(container);
            });
        });
    });

    describe('cell classes', function () {
        it('should draw the classes only  when dirty', function () {
            grid.cellClasses.add(grid.cellClasses.create(1, 1, ''));
            var spy = spyOn(view, '_drawCellClasses');
            helper.onDraw(function () {
                expect(spy).toHaveBeenCalled();
                spy.reset();
                view.draw();
            });
            helper.onDraw(function () {
                expect(spy).not.toHaveBeenCalled();
            });
        });

        it('should add a class to a cell', function () {
            var cellClass = 'myCellClasssss';
            var descriptor = grid.cellClasses.create(0, 0, cellClass);
            grid.cellClasses.add(descriptor);
            helper.onDraw(function () {
                expect(findGridCells().first()).toHaveClass(cellClass);
            });
        });

        it('should add a class to a range of cells cell', function () {
            var cellClass = 'myRangedClass';
            var descriptor = grid.cellClasses.create(0, 0, cellClass, 2, 3);
            grid.cellClasses.add(descriptor);
            helper.onDraw(function () {
                expectOnlyRangeToHaveClass(0, 0, 2, 3, cellClass);
            });
        });

        it('should add a class to infinite ranges', function () {
            var cellClass = 'myRangedClass';
            var descriptor = grid.cellClasses.create(0, 0, cellClass, Infinity, 2);

            grid.cellClasses.add(descriptor);
            helper.onDraw(function () {
                expectOnlyRangeToHaveClass(0, 0, viewRows, 2, cellClass);
                grid.cellScrollModel.scrollTo(5, 0);
            });
            helper.onDraw(function () {
                expectOnlyRangeToHaveClass(0, 0, viewRows, 2, cellClass);
            });
        });

        it('should clear previous classes on redraw', function () {
            var cellClass = 'myCellClasssss';
            var secondClass = 'totallyNewClass';
            var descriptor = grid.cellClasses.create(0, 0, cellClass);
            grid.cellClasses.add(descriptor);
            helper.onDraw(function () {

                descriptor.class = secondClass;
            });
            helper.onDraw(function () {
                expect(findCellByRowCol(0, 0)).toHaveClass(secondClass);
                expect(findCellByRowCol(0, 0)).not.toHaveClass(cellClass);
            });
        });

        it('should add a class to the right virtual cell after scroll', function () {
            var cellClass = 'myCellClasssss';
            var cellClass2 = 'invisible';
            var descriptor = grid.cellClasses.create(1, 1, cellClass);
            var descriptor2 = grid.cellClasses.create(0, 0, cellClass2);
            grid.cellClasses.add(descriptor);
            grid.cellClasses.add(descriptor2);
            helper.onDraw(function () {
                var cell = findCellByRowCol(1, 1);
                expect(cell).toHaveClass(cellClass);
                var cell2 = findCellByRowCol(0, 0);
                expect(cell2).toHaveClass(cellClass2);

                grid.cellScrollModel.scrollTo(1, 1);
            });

            helper.onDraw(function () {
                expect(findGridCells().first()).toHaveClass(cellClass);
                expect(findGridCells().first()).not.toHaveClass(cellClass2);
            });
        });
    });

})
;