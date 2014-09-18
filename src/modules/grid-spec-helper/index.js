module.exports = function () {

    var gridTestCore = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols) {
            var grid = {};
            grid.rowModel = require('@grid/row-model')(grid);
            grid.colModel = require('@grid/col-model')(grid);
            grid.dataModel = require('@grid/simple-data-model')(grid);
            grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);

            if (numRows) {
                for (var r = 0; r < numRows; r++) {
                    grid.rowModel.add({});
                    if (numCols) {
                        for (var c = 0; c < numCols || 0; c++) {
                            if (r === 0) {
                                grid.colModel.add({});
                            }
                            grid.dataModel.set(r, c, {value: r + '-' + c});
                        }
                    }
                }
            }


            return grid;
        }
    };

    beforeEach(inject(function () {
        gridTestCore.container = document.createElement('div');
        $(gridTestCore.container).css({
            width: gridTestCore.CONTAINER_WIDTH + 'px',
            height: gridTestCore.CONTAINER_HEIGHT + 'px'
        });
        $('body').append(gridTestCore.container);
    }));

    afterEach(function () {
        $(gridTestCore.container).remove();
    });

    return gridTestCore;

};
        