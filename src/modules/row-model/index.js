module.exports = function (_grid) {
    var grid = _grid;

    var DEFAULT_HEIGHT = 30;
    var rows = [];
    var numFixed = 0;
    var changeListeners = require('@grid/listeners')();

    var api = {
        add: function (row) {
            rows.push(row);
            changeListeners.notify();
        },
        get: function (index) {
            return rows[index];
        },
        length: function () {
            return rows.length;
        },
        height: function (index) {
            return rows[0] && rows[0].height || DEFAULT_HEIGHT;
        },
        numFixed: function () {
            return numFixed;
        },
        addChangeListener: changeListeners.addListener
    };

    return api;
};