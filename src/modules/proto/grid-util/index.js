module.exports = {
    getCellClass: function (r, c) {
        return 'row-' + r + ' col-' + c + ' cell ' + (r % 2 === 1 ? 'odd' : 'even');
    }
}