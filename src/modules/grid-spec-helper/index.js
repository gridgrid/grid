module.exports = function () {

    var gridTestCore = {
        CONTAINER_WIDTH: 800,
        CONTAINER_HEIGHT: 500,
        container: undefined,
        buildSimpleGrid: function (numRows, numCols) {
            gridTestCore.grid = require('@grid/simple-grid')(numRows, numCols)
            return gridTestCore.grid;
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
        