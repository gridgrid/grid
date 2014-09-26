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
        view.draw();
        expect(findGridCells(container).first().text()).toEqual('5-6');
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
        view.addDrawListener(spy);
        view.draw();
        expect(spy).toHaveBeenCalled();
    });


});