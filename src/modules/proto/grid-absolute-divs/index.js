var util = require('../proto/grid-util');

module.exports = {
    makeCell: function (r, c, grid) {
        return $('<div>').css({
            height: grid.cellHeight + 'px',
            width: grid.cellWidth + 'px',
            top: r * grid.cellHeight + 'px',
            left: c * grid.cellWidth + 'px',
            position: 'absolute'
        }).addClass(util.getCellClass(r, c)).text('');
    }
};