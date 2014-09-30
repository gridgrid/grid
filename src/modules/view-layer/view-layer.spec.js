var viewLayer = require('@grid/view-layer');

describe('view-layer', function () {

    var core = require('@grid/grid-spec-helper')();
    var minRows = 10;
    var minCols = 10;
    var view;
    var grid;
    var $ = require('jQuery');
    var container;

    beforeEach(inject(function () {
        grid = core.buildSimpleGrid(100, 20);
        view = grid.viewLayer;
        //mock the view port
        view.viewPort.sizeToContainer = function () {
        };
        view.viewPort.minRows = minRows;
        view.viewPort.minCols = minCols;
        container = core.viewBuild();
    }));

    function findGridCells(div) {
        return $(div).find('[dts="grid-cell"]');
    }

    function findCellContainer(div) {
        return $(div).find('[dts=grid-cells]');
    }

    it('should add a grid element to a supplied container', function () {
        expect(container.firstChild).toBeDefined();
    });

    it('should clear the container before building again', function () {
        view.build(container);
        expect(container.childElementCount).toBe(1);
    });


    it('should create a container for the cells', function () {
        expect(findCellContainer(container).length).toBe(1);
    });

    it('should create minRows x minCols cells', function () {
        expect(findGridCells(container).length).toBe(minCols * minRows);
    });

    it('should be able to write values to cells', function () {
        view.draw();
        expect(findGridCells(container).first().text()).toEqual('0-0');
    });

    it('should write widths and heights to the cells on draw', function () {
        expect(findGridCells(container).first().width()).toEqual(0);
        expect(findGridCells(container).first().height()).toEqual(0);
        view.draw();
        expect(findGridCells(container).first().width()).toEqual(100);
        expect(findGridCells(container).first().height()).toEqual(30);
    });

    it('should write offset values to the cells if scrolled', function () {
        grid.cellScrollModel.scrollTo(5, 6);
        expect(findGridCells(container).first().text()).toEqual('5-6');
    });

    it('should write offset values to the cells if scrolled', function () {
        grid.cellScrollModel.scrollTo(5, 6);
        expect(findGridCells(container).first().text()).toEqual('5-6');
    });

    it('shouldnt call draw cells if cell scroll model isnt dirty', function () {

        grid.cellScrollModel.scrollTo(5, 6);
        var spy = spyOn(grid.dataModel, 'getFormatted');
        view.draw();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should position the cells in a grid', function () {
        view.draw();
        expect(findGridCells(container).last().position()).toEqual({
            top: 30 * (minRows - 1),
            left: 100 * (minCols - 1)
        });
    });

    it('should notify on draw', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-draw', spy);
        view.draw();
        expect(spy).toHaveBeenCalled();
    });

    it('should remove all grid elements on destroy', function () {
        view.destroy();
        expect(container.children.length).toBe(0);
    });

    function makeDivDecorator() {
        var decDiv = document.createElement('div');
        var decorator = {
            render: function () {
                return decDiv;
            },
            getDiv: function () {
                return decDiv;
            }
        };
        return decorator;
    }

    describe('decorators', function () {
        var decorator;
        beforeEach(function () {
            decorator = makeDivDecorator();
        });

        it('should draw only when dirty', function () {
            var spy = spyOn(grid.decorators, 'getAlive').andCallThrough(); //treat this as the test that its going to draw
            grid.decorators.add(decorator);
            expect(spy).toHaveBeenCalled();
            spy.reset();
            grid.viewLayer.draw();
            expect(spy).not.toHaveBeenCalled();
        });

        it('should have a container', function () {
            expect($(container).find('[dts="grid-decorators"]').length).toBe(1);
        });


        it('should render a decorator into a container with pointer events none', function () {
            grid.decorators.add(decorator);
            expect(decorator.getDiv().parentElement).toBeTruthy();
            expect($(decorator.getDiv()).parents('[dts=grid-decorators]').length).toBe(1);
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
            view.destroy();
            expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
        });

        it('should destroy dead decorators on draw', function () {
            var spy = jasmine.createSpy();
            decorator.getDiv().addEventListener('decorator-destroy', spy);
            grid.decorators.add(decorator);
            grid.decorators.remove(decorator); //remove implicitly calls draw
            expectDestroySpyToBeCalledAndDecoratorToBeOutOfTheDom(spy);
        });

        function setDecoratorPosition(top, left, bottom, right) {
            decorator.top = top;
            decorator.left = left;
            decorator.bottom = bottom;
            decorator.right = right;
        }

        function expectBoundingBoxSize(top, left, height, width) {
            var $boundingBox = $(decorator.boundingBox);
            expect($boundingBox.position().top).toBe(top);
            expect($boundingBox.position().left).toBe(left);
            expect($boundingBox.height()).toBe(height);
            expect($boundingBox.width()).toBe(width);
        }

        it('should position a virtual cell range decorator', function () {
            setDecoratorPosition(5, 6, 7, 9);
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5 * 30, 6 * 100, 3 * 30, 3 * 100);
        });

        it('should position a virtual pixel range decorator', function () {
            setDecoratorPosition(5, 6, 7, 9);
            decorator.units = 'px';
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5, 6, 3, 3);
        });

        it('should position a real cell range decorator', function () {
            setDecoratorPosition(5, 6, 7, 9);
            decorator.space = 'real';
            grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5 * 30, 6 * 100, 3 * 30, 3 * 100);
        });

        it('should position a real pixel range decorator', function () {
            setDecoratorPosition(5, 6, 7, 9);
            decorator.units = 'px';
            decorator.space = 'virtual';
            grid.cellScrollModel.scrollTo(1, 1); //scroll should have no effect on the position;
            grid.decorators.add(decorator);
            expectBoundingBoxSize(5, 6, 3, 3);
        });
    });


});