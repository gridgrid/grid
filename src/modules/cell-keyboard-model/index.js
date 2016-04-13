var customEvent = require('../custom-event');

module.exports = function(_grid) {
    var grid = _grid;

    var model = {};

    model._annotateEvent = function annotateEvent(e) {
        /*eslint-disable no-fallthrough*/
        switch (e.type) {
            case 'keydown':
            case 'keypress':
            case 'keyup':
                model._annotateEventInternal(e);
                break;
        }
        /*eslint-enable no-fallthrough*/
    };

    model._annotateEventFromDataCoords = function(e, dataRow, dataCol) {
        e.realRow = grid.data.row.toView(dataRow);
        e.realCol = grid.data.col.toView(dataCol);
        e.virtualRow = grid.data.row.toVirtual(dataRow);
        e.virtualCol = grid.data.col.toVirtual(dataCol);
        e.row = dataRow;
        e.col = dataCol;
        return e;
    };

    model._annotateEventInternal = function(e) {
        var dataRow = grid.navigationModel.focus.row;
        var dataCol = grid.navigationModel.focus.col;
        model._annotateEventFromDataCoords(e, dataRow, dataCol);
    };

    grid.eventLoop.addInterceptor(model._annotateEvent);

    return model;
};
