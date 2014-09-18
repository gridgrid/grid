module.exports = function (_grid) {
    var viewInterface = {};

    var grid = _grid;
    var container;
    var root;
    var cellContainer;
    var cells;

    viewInterface.viewPort = require('@grid/view-port')(grid);

    viewInterface.build = function (elem) {
        container = elem;
        cleanup();


        cellContainer = document.createElement('div');
        cellContainer.setAttribute('dts', 'grid-cells');
        buildCells(cellContainer);

        root = document.createElement('div');
        root.appendChild(cellContainer);

        viewInterface.viewPort.sizeToContainer(container);

        container.appendChild(root);
    };

    viewInterface.draw = function () {
        viewInterface.viewPort.iterateCells(function (r, c) {
            var cell = cells[r][c];
            var width = grid.colModel.width(c);
            var height = grid.rowModel.height(r); //maybe faster to do this only on row iterations but meh
            cell.style.width = width + 'px';
            cell.style.height = height + 'px';

            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
            var modelR = r + grid.cellScrollModel.row;
            var modelC = c + grid.cellScrollModel.col;
            var formattedData = grid.dataModel.getFormatted(modelR, modelC);
            cell.appendChild(document.createTextNode(formattedData));
        });
    };

    function buildCells(cellContainer) {
        cells = [];
        viewInterface.viewPort.iterateCells(function (r, c) {
            var cell = buildDivCell();
            cells[r][c] = cell;
            cellContainer.appendChild(cell);
        }, function (r) {
            cells[r] = [];
        });
    }

    function buildDivCell() {
        var cell = document.createElement('div');
        cell.setAttribute('dts', 'grid-cell');
        var style = cell.style;
        style.position = 'absolute';
        style.boxSizing = 'border-box';
        return cell;
    }

    function cleanup() {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    return viewInterface;
};