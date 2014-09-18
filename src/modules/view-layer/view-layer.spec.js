var viewLayer = require('@grid/view-layer');

describe('view-layer', function () {

    var core = require('@grid/grid-spec-helper')();
    var minRows = 10;
    var minCols = 10;
    var view;
    var grid

    beforeEach(inject(function () {
        grid = core.buildSimpleGrid(100, 20);
        view = grid.viewLayer;
        //mock the view port
        view.viewPort.sizeToContainer = function () {
        };
        view.viewPort.minRows = minRows;
        view.viewPort.minCols = minCols;

    }));

    function buildGrid() {
        view.build(core.container);
        return core.container;
    }

    it('should add a grid element to a supplied container', function () {
        var div = buildGrid();
        expect(div.firstChild).toBeDefined();
    });

    it('should clear the container before building again', function () {
        var div = buildGrid();
        view.build(div);
        expect(div.childElementCount).toBe(1);
    });


    it('should create a container for the cells', function () {
        var div = buildGrid();
        expect(findCellContainer(div).length).toBe(1);
    });

    it('should create minRows x minCols cells', function () {
        var div = buildGrid();
        expect(findGridCells(div).length).toBe(minCols * minRows);
    });

    it('should be able to write values to cells', function () {
        var div = buildGrid();
        view.draw();
        expect(findGridCells(div).first().text()).toEqual('0-0');
    });

    it('should write widths and heights to the cells on draw', function () {
        var div = buildGrid();
        expect(findGridCells(div).first().width()).toEqual(0);
        expect(findGridCells(div).first().height()).toEqual(0);
        view.draw();
        expect(findGridCells(div).first().width()).toEqual(100);
        expect(findGridCells(div).first().height()).toEqual(30);
    });

    it('should write offset values to the cells if scrolled', function () {
        var div = buildGrid();
        grid.cellScrollModel.scrollTo(5, 6);
        view.draw();
        expect(findGridCells(div).first().text()).toEqual('5-6');
    });

    it('should position the cells in a grid', function () {
        var div = buildGrid();
        view.draw();
        expect(findGridCells(div).last().position()).toEqual({top: 30 * (minRows - 1), left: 100 * (minCols - 1)});
    });

    function findGridCells(div) {
        return $(div).find('[dts="grid-cell"]');
    }

    function findCellContainer(div) {
        return $(div).find('[dts=grid-cells]');
    }

});