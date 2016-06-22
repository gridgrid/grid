describe('view-layer', function () {

    require('../grid-spec-helper')();
    var viewRows = 10;
    var viewCols = 10;
    var view;
    var grid;
    var $ = require('jquery');
    var container;

    function viewBeforeEach(varyHeight, varyWidth, frows, fcols, hrows, hcols) {
        grid = this.buildSimpleGrid(100, 20, varyHeight, varyWidth, frows, fcols, hrows, hcols);
        view = grid.viewLayer;
        //mock the view port
        grid.viewPort.sizeToContainer = function () {};
        grid.viewPort.rows = viewRows;
        grid.viewPort.cols = viewCols;
        container = this.viewBuild();
    }

    function findGridCells(parent) {
        return $(parent || container).find('[dts="grid-cell"]');
    }

    function findGridRows(parent) {
        return $(parent || container).find('[dts="grid-row"]');
    }

    function findCellContainer() {
        return $(container).find('[dts=grid-cells]');
    }

    function findColCellsByIndex(index) {
        var containers;
        var allContainers = findCellContainer();
        if (index < grid.colModel.numFixed()) {
            containers = allContainers.eq(0).add(allContainers.eq(2));
        } else {
            index -= grid.colModel.numFixed();
            containers = allContainers.eq(1).add(allContainers.eq(3));
        }
        return $(containers).find('[dts="grid-cell"]:nth-child(' + (index + 1) + ')');
    }

    function findRowCellsByIndex(index) {
        var allContainers = findCellContainer();
        var leftRowAtIndex = findGridRows(allContainers.eq(0).add(allContainers.eq(2))).eq(index);
        var rightRowAtIndex = findGridRows(allContainers.eq(1).add(allContainers.eq(3))).eq(index);
        return findGridCells(leftRowAtIndex.add(rightRowAtIndex));
    }

    function findCellByRowCol(r, c) {
        return $(findRowCellsByIndex(r)[c]);
    }

    function getCellText(r, c, header) {
        var h = header ? 'h' : '';
        return h + 'r' + r + ' ' + h + 'c' + c;
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

    function expectFirstCellText(text) {
        expect(findGridCells(container).first().text()).toEqual(text);
    }


    function expectFirstAndSecondCell(firstCellWidth) {
        var cells = findGridCells(container);
        expect(cells.first().position()).toEqual({
            top: 0,
            left: 0
        });

        expect(cells.first().width()).toBe(firstCellWidth);
        expect($(cells[1]).position()).toEqual({
            top: 0,
            left: firstCellWidth - 1
        });
    }

    describe('', function () {

        beforeEach(function () {
            viewBeforeEach.call(this);
        });


        it('should add a grid element to a supplied container', function () {
            expect(container.firstChild).toBeDefined();
        });

        it('should clear the container before building again', function () {
            view.build(container);
            expect(container.childElementCount).toBe(2);
        });


        // it('should create a container for the cells', function() {
        //     var cellContainer = findCellContainer();
        //     expect(cellContainer.length).toBe(1);
        //     expect(cellContainer.hasClass('grid-cells')).toBe(true);
        // });

        // it('should position the cell container pinned with zindex 0', function() {
        //     var cellContainer = findCellContainer();
        //     expect(cellContainer).toBePositioned(0, 0, 0, 0);
        //     expect(cellContainer.css('zIndex')).toBe('0');
        // });

        it('should create rows x cols cells', function (done) {
            view.draw();
            this.onDraw(function () {
                var gridCells = findGridCells(container);
                expect(gridCells.length).toBe(viewCols * viewRows);
                done();
            });
        });

        it('should clear the cell container before rebuilding the cells', function (done) {
            view.draw();
            this.onDraw(function () {
                var gridCells = findGridCells(container);
                expect(gridCells.length).toBe(viewCols * viewRows);
                view.draw();
                this.onDraw(function () {
                    var gridCells = findGridCells(container);
                    expect(gridCells.length).toBe(viewCols * viewRows);
                    done();
                });
            });

        });

        it('shouldnt call build cells if viewport isnt dirty', function (done) {
            this.resetAllDirties();
            var spy = spyOn(view, '_buildCells');
            view.draw();
            this.onDraw(function () {
                expect(spy).not.toHaveBeenCalled();
                done();
            });
        });

        describe('redraw', function () {
            function expectRedraw(methods, thingToTriggerRedraw, done) {
                this.resetAllDirties();
                var drawMethods = methods;
                var spies = drawMethods.map(function (method) {
                    return spyOn(view, method);
                });
                thingToTriggerRedraw();
                this.onDraw(function () {
                    spies.forEach(function (spy) {
                        expect(spy).toHaveBeenCalled();
                    });
                    done();
                });
            }

            it('should redraw everything if viewPort is dirty', function (done) {
                expectRedraw.call(this, ['_buildCells', '_buildCols', '_drawCells', '_drawCellClasses', '_drawDecorators'], function () {
                    grid.viewPort.width = 1;
                }, done);
            });

            it('should rebuild colbuilders and draw cells if col builders are dirty', function (done) {
                expectRedraw.call(this, ['_buildCols', '_drawCells'], function () {
                    grid.colModel.get(0).builder = grid.colModel.createBuilder();
                }, done);
            });

            it('should rebuild row headers and draw cells if row builders are dirty', function (done) {
                expectRedraw.call(this, ['_buildRows', '_drawCells'], function () {
                    grid.rowModel.get(0).builder = grid.rowModel.createBuilder();
                }, done);
            });

            it('should redraw everything if col model is dirty', function (done) {
                expectRedraw.call(this, ['_drawCells', '_drawCellClasses', '_drawDecorators'], function () {
                    grid.colModel.add({});
                }, done);
            });

            it('should redraw everything if row model is dirty', function (done) {
                expectRedraw.call(this, ['_drawCells', '_drawCellClasses', '_drawDecorators'], function () {
                    grid.rowModel.add({});
                }, done);
            });

            it('should redraw cells if data model is dirty', function (done) {
                expectRedraw.call(this, ['_drawCells'], function () {
                    grid.dataModel.toggleSort();
                }, done);
            });
        });

        it('should add style classes to the cell on draw', function (done) {
            view.draw();
            this.onDraw(function () {
                expectOnlyRangeToHaveClass(0, 0, viewRows, viewCols, 'grid-cell');
                done();
            });
        });

        it('should wrap rows in a div', function (done) {
            view.draw();
            this.onDraw(function () {
                var rows = findGridRows();
                expect(rows.length).toBe(viewRows);
                expect(rows.hasClass('grid-row'));
                done();
            });
        });

        it('should add a class to indicate the scroll top is odd', function (done) {
            grid.cellScrollModel.scrollTo(1, 0);
            this.onDraw(function () {
                expect(findCellContainer()).toHaveClass('odds');
                grid.cellScrollModel.scrollTo(2, 0);
                this.onDraw(function () {
                    expect(findCellContainer()).not.toHaveClass('odds');
                    done();
                });
            });
        });

        it('should be able to write values to cells', function (done) {
            view.draw();
            this.onDraw(function () {
                expect(findGridCells(container).first().text()).toEqual(getCellText(0, 0));
                done();
            });
        });


        it('should set the height of rows on draw', function (done) {
            view.draw();
            this.onDraw(function () {
                var rows = findGridRows();
                expect(rows.first().height()).toBe(31);
                done();
            });
        });

        it('should set display none if a row is height 0 and clear it if not', function (done) {
            var row = this.grid.rowModel.get(3);
            row.hidden = true;
            this.onDraw(function () {
                var rows = findGridRows();
                expect($(rows[3]).css('display')).toBe('none');
                row.hidden = false;
                this.onDraw(function () {
                    var rows = findGridRows();
                    expect($(rows[3]).css('display')).toBe('block');
                    done();
                });
            });
        });

        it('should reduce the rows width if scrolled to the end', function (cb) {
            this.grid.cellScrollModel.scrollTo(0, 1000000);
            this.onDraw(function () {
                var rows = findGridRows(findCellContainer()[3]);
                var lastCell = findCellByRowCol(0, 0);
                expect(rows.width()).toBe(lastCell.position().left + lastCell.width() - 1);
                cb();
            });
        });

        it('should write widths and heights to the cells on draw', function (done) {
            view.draw();
            this.onDraw(function () {
                //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders
                expect(findGridCells(container).first().width()).toEqual(101);
                expect(findGridCells(container).first().height()).toEqual(31);
                done();
            });
        });

        it('should set display none if a col is width 0 and clear it if not', function (done) {
            var col = this.grid.colModel.get(3);
            col.hidden = true;
            this.onDraw(function () {
                var cells = findGridCells(container);
                expect($(cells[3]).css('display')).toBe('none');
                col.hidden = false;
                this.onDraw(function () {
                    var cells = findGridCells(container);
                    expect($(cells[3]).css('display')).toBe('block');
                    done();
                });
            });
        });

        it('should write widths and heights with extra border width', function (done) {
            var styleOverride = document.createElement('style');
            styleOverride.innerHTML = '.grid-cell{border : 2px solid black;}';
            document.body.appendChild(styleOverride);
            container = this.viewBuild();
            view.draw();
            this.onDraw(function () {
                document.body.removeChild(styleOverride);
                //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders
                expect(findGridCells(container).first().width()).toEqual(102);
                expect(findGridCells(container).first().height()).toEqual(32);
                done();
            });

        });

        it('should write offset values to the cells if scrolled', function (done) {
            grid.cellScrollModel.scrollTo(5, 6);
            this.onDraw(function () {
                expectFirstCellText(getCellText(5, 6));
                done();
            });
        });

        it('shouldnt call draw cells if cell scroll model isnt dirty', function (done) {

            this.resetAllDirties();
            var spy = spyOn(view, '_drawCells');
            view.draw();
            this.onDraw(function () {
                expect(spy).not.toHaveBeenCalled();
                done();
            });
        });

        it('should position the cells in a grid', function (done) {
            view.draw();
            this.onDraw(function () {
                //the row does the vertical positioning so we have to check the top value of offset and left value of position
                expect(findGridCells(container).last().offset().top).toEqual(30 * (viewRows - 1));
                expect(findGridCells(container).last().position().left).toEqual(100 * (viewCols - 1));
                done();
            });
        });

        it('should notify on draw', function (done) {
            var spy = jasmine.createSpy();
            grid.eventLoop.bind('grid-draw', spy);
            view.draw();
            this.onDraw(function () {
                expect(spy).toHaveBeenCalled();
                done();
            });
        });

        it('should remove all grid elements on destroy', function () {
            grid.eventLoop.fire('grid-destroy');
            //one because the text area will still be there
            expect(container.children.length).toBe(1);
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

            it('should draw only when dirty', function (done) {
                var spy = spyOn(view, '_drawDecorators'); //treat this as the test that its going to draw
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    expect(spy).toHaveBeenCalled();
                    spy.calls.reset();
                    grid.viewLayer.draw();
                    this.onDraw(function () {
                        expect(spy).not.toHaveBeenCalled();
                        done();
                    });
                });
            });

            it('should have a container after the cell container', function () {
                var decoratorContainer = $(container).find('[dts="grid-decorators"]');
                expect(decoratorContainer.length).toBe(4);
                expect(decoratorContainer.prevAll('[dts=grid-cells]').length).toBeGreaterThan(0);
            });

            it('should be positioned pinned to the edges with zindex and pointer events none', function () {
                var decoratorContainer = $(container).find('[dts="grid-decorators"]');
                expect(decoratorContainer).toBePositioned(0, 0, 0, 0);
                expect(decoratorContainer.css('pointerEvents')).toBe('none');
            });

            it('should render a decorator into a container with pointer events none', function (done) {
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    expect(decorator.getDiv().parentElement).toBeTruthy();
                    expect($(decorator.getDiv()).parents('[dts=grid-decorators]').length).toBe(1);
                    expect(decorator.boundingBox.style.pointerEvents).toBe('none');
                    done();
                });
            });

            function expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy) {
                expect(spy).toHaveBeenCalled();
                var boundingBox = decorator.getDiv().parentElement;
                expect(boundingBox.parentElement).toBeFalsy();
                expect(decorator.boundingBox).toBeFalsy();
            }

            it('should receive a destroy event when the grid is cleaned up and not be in the dom', function (done) {
                var spy = jasmine.createSpy();
                decorator.getDiv().addEventListener('decorator-destroy', spy);
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    grid.eventLoop.fire('grid-destroy');
                    expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
                    done();
                });
            });

            it('should destroy dead decorators on draw', function (done) {
                var spy = jasmine.createSpy();
                decorator.getDiv().addEventListener('decorator-destroy', spy);
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    grid.decorators.remove(decorator); //remove implicitly calls draw
                    this.onDraw(function () {
                        expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
                        done();
                    });
                });
            });

            function setDecoratorPosition(top, left, height, width) {
                decorator.top = top;
                decorator.left = left;
                decorator.height = height;
                decorator.width = width;
            }

            function expectBoundingBoxSize(top, left, height, width, nextFn) {
                this.onDraw(function () {
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

            it('should position a virtual cell range decorator', function (done) {
                setDecoratorPosition(5, 6, 3, 3);
                grid.decorators.add(decorator);
                // the plus one is so it overlaps the borders
                expectBoundingBoxSize.call(this, 5 * 30, 6 * 100, 3 * 30 + 1, 3 * 100 + 1, done);
            });

            it('should position a data cell range decorator', function (done) {
                viewBeforeEach.call(this, false, false, 0, 0, 1, 1);
                setDecoratorPosition(5, 6, 3, 3);
                grid.decorators.add(decorator);
                decorator.space = 'data';
                // the plus one is so it overlaps the borders
                expectBoundingBoxSize.call(this, 6 * 30, 7 * 100, 3 * 30 + 1, 3 * 100 + 1, done);
            });

            it('should handle virtual cell ranges that are not in view', function (done) {
                setDecoratorPosition(1, 1, 1, 1);
                grid.cellScrollModel.scrollTo(2, 2);
                grid.decorators.add(decorator);

                this.onDraw(function () {
                    expect(decorator.boundingBox.style.display).toBe('none');
                    done();
                });
            });

            it('should handle virtual cell ranges that are not valid', function (done) {
                setDecoratorPosition(-1, -1, -1, -1);
                grid.decorators.add(decorator);

                this.onDraw(function () {
                    expect(decorator.boundingBox.style.display).toBe('none');
                    done();
                });
            });

            xit('should position a virtual pixel range decorator', function (done) {
                grid.cellScrollModel.scrollTo(1, 1);
                setDecoratorPosition(5, 6, 2, 3);
                decorator.units = 'px';
                grid.decorators.add(decorator);
                expectBoundingBoxSize.call(this, 35, 106, 2, 3, done);
            });

            it('should position a real cell range decorator', function (done) {
                setDecoratorPosition(5, 6, 3, 3);
                decorator.space = 'real';
                grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
                grid.decorators.add(decorator);
                // the plus one is so it overlaps the borders
                expectBoundingBoxSize.call(this, 5 * 30, 6 * 100, 3 * 30 + 1, 3 * 100 + 1, done);
            });

            it('should position a real pixel range decorator', function (done) {
                setDecoratorPosition(5, 6, 2, 4);
                decorator.units = 'px';
                decorator.space = 'real';
                grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
                grid.decorators.add(decorator);
                expectBoundingBoxSize.call(this, 5, 6, 2, 4, done);

            });

            it('should reposition if decorators box changes', function (done) {
                setDecoratorPosition(5, 6, 2, 3);
                decorator.units = 'px';
                decorator.space = 'real';
                grid.decorators.add(decorator);
                var self = this;
                expectBoundingBoxSize.call(self, 5, 6, 2, 3, function next() {
                    setDecoratorPosition(1, 6, 6, 3);
                    expectBoundingBoxSize.call(self, 1, 6, 6, 3, done);
                });


            });

            it('should reposition if decorators units changes', function (done) {
                setDecoratorPosition(5, 6, 2, 3);
                decorator.units = 'cell';
                decorator.space = 'real';
                grid.decorators.add(decorator);
                var self = this;
                expectBoundingBoxSize.call(this, 5 * 30, 6 * 100, 2 * 30 + 1, 3 * 100 + 1, function next() {
                    decorator.units = 'px';
                    expectBoundingBoxSize.call(self, 5, 6, 2, 3, done);
                });
            });

            it('should clamp a decorators height and width to the viewport', function (done) {
                setDecoratorPosition(5, 6, Infinity, Infinity);
                decorator.space = 'real';
                decorator.units = 'px';
                grid.decorators.add(decorator);
                expectBoundingBoxSize.call(this, 5, 6, grid.viewPort.height, grid.viewPort.width, done);
            });

            it('should reposition if scrolled or col dirty', function () {

            });

            it('should not display a decorator with no width', function (cb) {
                var row = this.grid.rowModel.get(3);
                row.hidden = true;
                setDecoratorPosition(3, 3, 1, 1);
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    expect(decorator.boundingBox.style.display).toBe('none');
                    row.hidden = false;
                    this.onDraw(function () {
                        expect(decorator.boundingBox.style.display).toBe('');
                        cb();
                    });
                });
            });

            it('should not display a decorator with no height', function (cb) {
                var col = this.grid.colModel.get(3);
                col.hidden = true;
                setDecoratorPosition(3, 3, 1, 1);
                grid.decorators.add(decorator);
                this.onDraw(function () {
                    expect(decorator.boundingBox.style.display).toBe('none');
                    col.hidden = false;
                    this.onDraw(function () {
                        expect(decorator.boundingBox.style.display).toBe('');
                        cb();
                    });
                });
            });
        });

        describe('col builders', function () {
            beforeEach(function () {
                this.rowColModel = grid.colModel;
                this.numBuilt = grid.viewPort.rows;
                this.findCells = findColCellsByIndex;
                this.getCtxForBuilt = function (r) {
                    return {
                        virtualRow: r + 1,
                        virtualCol: 1,
                        data: grid.dataModel.get(r + 1, 1)
                    };
                };
                this.scrolledBuilderRowCol = 1;
            });

            testBuilders('col');

            it('should not call update for cols out of the view', function (done) {
                var builder = grid.colModel.createBuilder();
                var updateSpy = spyOn(builder, 'update');
                grid.colModel.get(0).builder = builder;
                grid.cellScrollModel.scrollTo(1, 1);
                this.onDraw(function () {
                    expect(updateSpy).not.toHaveBeenCalled();
                    done();
                });
            });

        });


        describe('cell classes', function () {
            it('should draw the classes only  when dirty', function (done) {
                grid.cellClasses.add(grid.cellClasses.create(1, 1, ''));
                var spy = spyOn(view, '_drawCellClasses');
                this.onDraw(function () {
                    expect(spy).toHaveBeenCalled();
                    spy.calls.reset();
                    view.draw();
                    this.onDraw(function () {
                        expect(spy).not.toHaveBeenCalled();
                        done();
                    });
                });

            });

            it('should add a class to a cell', function (done) {
                var cellClass = 'myCellClasssss';
                var descriptor = grid.cellClasses.create(0, 0, cellClass);
                descriptor.space = 'virtual';
                grid.cellClasses.add(descriptor);
                this.onDraw(function () {
                    expect(findGridCells().first()).toHaveClass(cellClass);
                    done();
                });
            });

            it('should add a class to a range of cells', function (done) {
                var cellClass = 'myRangedClass';
                var descriptor = grid.cellClasses.create(0, 0, cellClass, 2, 3, 'virtual');
                grid.cellClasses.add(descriptor);
                this.onDraw(function () {
                    expectOnlyRangeToHaveClass(0, 0, 2, 3, cellClass);
                    done();
                });
            });

            it('should add a class to infinite ranges', function (done) {
                var cellClass = 'myRangedClass';
                var descriptor = grid.cellClasses.create(0, 0, cellClass, Infinity, 2, 'virtual');

                grid.cellClasses.add(descriptor);
                this.onDraw(function () {
                    expectOnlyRangeToHaveClass(0, 0, viewRows, 2, cellClass);
                    grid.cellScrollModel.scrollTo(5, 0);
                    this.onDraw(function () {
                        expectOnlyRangeToHaveClass(0, 0, viewRows, 2, cellClass);
                        done();
                    });
                });
            });

            it('should clear previous classes on redraw', function (done) {
                var cellClass = 'myCellClasssss';
                var secondClass = 'totallyNewClass';
                var descriptor = grid.cellClasses.create(0, 0, cellClass);
                descriptor.space = 'virtual';
                grid.cellClasses.add(descriptor);
                this.onDraw(function () {
                    descriptor.class = secondClass;
                    this.onDraw(function () {
                        expect(findCellByRowCol(0, 0)).toHaveClass(secondClass);
                        expect(findCellByRowCol(0, 0)).not.toHaveClass(cellClass);
                        done();
                    });
                });

            });

            it('should add a class to the right virtual cell after scroll', function (done) {
                var cellClass = 'myCellClasssss';
                var cellClass2 = 'invisible';
                var descriptor = grid.cellClasses.create(1, 1, cellClass);
                descriptor.space = 'virtual';
                var descriptor2 = grid.cellClasses.create(0, 0, cellClass2);
                descriptor2.space = 'virtual';
                grid.cellClasses.add(descriptor);
                grid.cellClasses.add(descriptor2);
                this.onDraw(function () {
                    var cell = findCellByRowCol(1, 1);
                    expect(cell).toHaveClass(cellClass);
                    var cell2 = findCellByRowCol(0, 0);
                    expect(cell2).toHaveClass(cellClass2);

                    grid.cellScrollModel.scrollTo(1, 1);
                    this.onDraw(function () {
                        expect(findGridCells().first()).toHaveClass(cellClass);
                        expect(findGridCells().first()).not.toHaveClass(cellClass2);
                        done();
                    });
                });
            });
        });

    });

    function testBuilders(rowOrCol) {
        it('should call render for each view ' + rowOrCol + 'on build', function (done) {
            var builder = this.rowColModel.createBuilder();
            var renderSpy = spyOn(builder, 'render');
            this.rowColModel.get(0).builder = builder;
            this.onDraw(function () {
                expect(renderSpy).toHaveBeenCalled();
                expect(renderSpy.calls.count()).toBe(this.numBuilt);
                done();
            });
        });

        it('should put the returned element into the cells for that ' + rowOrCol, function (done) {
            var builder = this.rowColModel.createBuilder(function () {
                return document.createElement('a');
            }, function (elem) {
                return elem;
            });
            this.rowColModel.get(0).builder = builder;
            this.onDraw(function () {
                this.findCells(0).each(function () {
                    var firstChild = this.firstChild;
                    expect(firstChild.tagName).toBe('A');
                });
                done();
            });
        });

        it('should use a text node if the update doesnt return an element', function (done) {
            var builder = this.rowColModel.createBuilder(function () {
                return document.createElement('a');
            }, function (elem, ctx) {
                if (ctx.virtualRow === 1 || ctx.virtualCol === 1) {
                    return undefined;
                }
                return elem;
            });
            this.rowColModel.get(0).builder = builder;
            this.onDraw(function () {
                this.findCells(0).each(function (index) {
                    var firstChild = this.firstChild;
                    if (index === 1) {
                        expect(firstChild.nodeType).toBe(3);
                    } else {
                        expect(firstChild.tagName).toBe('A');
                    }
                });
                done();
            });
        });


        it('should call update for each view cell on draw', function (done) {
            var builder = this.rowColModel.createBuilder();
            var updateSpy = spyOn(builder, 'update');
            this.rowColModel.get(this.scrolledBuilderRowCol).builder = builder;
            this.onDraw(function () {
                expect(updateSpy).toHaveBeenCalled();
                expect(updateSpy.calls.count()).toBe(this.numBuilt);
                updateSpy.calls.reset();
                grid.cellScrollModel.scrollTo(1, 1);
                this.onDraw(function () {
                    expect(updateSpy).toHaveBeenCalled();
                    expect(updateSpy.calls.count()).toBe(this.numBuilt);
                    done();
                });
            });

        });


        it('should pass back the rendered element to the update function', function (done) {
            var aTags = [];
            var updateSpy = jasmine.createSpy('update');
            var builder = this.rowColModel.createBuilder(function () {
                var aTag = document.createElement('a');
                aTags.push(aTag);
                return aTag;
            }, updateSpy);
            grid.colModel.get(0).builder = builder;
            this.onDraw(function () {
                expect(aTags.length).toBe(this.numBuilt);
                aTags.forEach(function (aTag, i) {
                    expect(updateSpy.calls.argsFor(i)[0]).toBe(aTag);
                });
                done();
            });
        });

        it('should call update with a context obj', function (done) {
            var updateSpy = jasmine.createSpy('update');
            var builder = this.rowColModel.createBuilder(undefined, updateSpy);
            this.rowColModel.get(this.scrolledBuilderRowCol).builder = builder;
            grid.cellScrollModel.scrollTo(1, 1);
            this.onDraw(function () {
                for (var r = 0; r < this.numBuilt; r++) {
                    expect(updateSpy.calls.argsFor(r)[1]).toEqual(this.getCtxForBuilt(r));
                }
                done();
            });
        });
    }

    describe('varied sizes', function () {

        it('should position on scroll', function (done) {
            viewBeforeEach.call(this, [20, 30, 40], [99, 100, 101]);
            view.draw();
            this.onDraw(function () {
                expectFirstAndSecondCell(100);
                grid.cellScrollModel.scrollTo(1, 1);
                this.onDraw(function () {
                    expectFirstAndSecondCell(101);
                    done();
                });
            });


        });

        it('should write varied widths and heights', function (done) {
            viewBeforeEach.call(this, [20, 30, 40], [99, 100, 101]);
            view.draw();
            this.onDraw(function () {
                //we want the heights and widths to be rendered at 1 higher than their virtual value in order to collapse the borders
                expect(findColCellsByIndex(0).width()).toEqual(100);
                expect(findColCellsByIndex(1).width()).toEqual(101);
                expect(findColCellsByIndex(2).width()).toEqual(102);
                expect(findRowCellsByIndex(0).height()).toEqual(21);
                expect(findRowCellsByIndex(1).height()).toEqual(31);
                expect(findRowCellsByIndex(2).height()).toEqual(41);
                done();
            });
        });
    });

    describe('fixed rows and cols', function () {
        it('should not move rows on scroll', function (done) {
            viewBeforeEach.call(this, false, false, 1, 0);
            grid.cellScrollModel.scrollTo(1, 0);
            this.onDraw(function () {
                expectFirstCellText(getCellText(0, 0));
                done();
            });
        });

        it('should not move cols on scroll', function (done) {
            viewBeforeEach.call(this, false, false, 0, 1);
            grid.cellScrollModel.scrollTo(0, 1);
            this.onDraw(function () {
                expectFirstCellText(getCellText(0, 0));
                done();
            });
        });

        it('should affect positioning of unfixed', function (done) {
            viewBeforeEach.call(this, false, false, 1, 0);
            grid.cellScrollModel.scrollTo(1, 0);
            this.onDraw(function () {
                findGridCells(container);
                done();
            });
        });

        it('should have a class to indicate the last', function (done) {
            viewBeforeEach.call(this, false, false, 1, 1);
            this.onDraw(function () {
                expect(findColCellsByIndex(0)[1]).toHaveClass('grid-last-fixed-col');
                expect(findRowCellsByIndex(0)[1]).toHaveClass('grid-last-fixed-row');
                done();
            });
        });
    });

    describe('headers', function () {

        beforeEach(function () {
            viewBeforeEach.call(this, false, false, 1, 1, 1, 1);
        });

        it('should get a special class', function (done) {

            this.onDraw(function () {
                expect(findColCellsByIndex(1)[0]).toHaveClass('grid-header grid-col-header');
                expect(findRowCellsByIndex(1)[0]).toHaveClass('grid-header grid-row-header');
                done();
            });
        });

        it('should offset the data by the headers', function (done) {
            this.onDraw(function () {
                expect(findCellByRowCol(1, 1).text()).toBe(getCellText(0, 0));
                done();
            });
        });

        it('should set the contents of the headers', function (done) {
            this.onDraw(function () {
                expect(findCellByRowCol(0, 0).text()).toBe(getCellText(0, 0, true));
                done();
            });
        });

        it('should add a class to a range of cells in the data space', function (done) {
            var cellClass = 'myRangedClass';
            var descriptor = grid.cellClasses.create(0, 0, cellClass, 2, 3, 'data');
            grid.cellClasses.add(descriptor);
            this.onDraw(function () {
                expectOnlyRangeToHaveClass.call(this, 1, 1, 2, 3, cellClass);
                done();
            });
        });

        describe('row builders', function () {
            beforeEach(function () {
                this.rowColModel = grid.rowModel;
                this.numBuilt = grid.viewPort.cols;
                this.findCells = findRowCellsByIndex;
                this.getCtxForBuilt = function (c) {
                    var virtualCol = grid.viewPort.toVirtualCol(c);
                    return {
                        virtualRow: 0,
                        virtualCol: virtualCol,
                        data: grid.dataModel.getHeader(0, virtualCol)
                    };
                };
                this.scrolledBuilderRowCol = 0;
            });

            testBuilders('row');

        });

    });

});
