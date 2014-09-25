module.exports = function (_grid) {
    var grid = _grid;

    var DEFAULT_WIDTH = 100;
    var cols = [];
    var numFixed = 0;
    var changeListeners = require('@grid/listeners')();

    var api = {
        add: function (col) {
            cols.push(col);
            changeListeners.notify();
        },
        get: function (index) {
            return cols[index];
        },
        length: function () {
            return cols.length;
        },
        width: function (index) {
            return cols[0].width || DEFAULT_WIDTH;
        },
        numFixed: function () {
            return numFixed;
        },
        addChangeListener: changeListeners.addListener
    };

    return api;
};