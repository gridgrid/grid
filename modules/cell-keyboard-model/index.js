"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var event_loop_1 = require("../event-loop");
function create(grid) {
    var _annotateEventFromDataCoords = function (e, dataRow, dataCol) {
        e.realRow = grid.data.row.toView(dataRow);
        e.realCol = grid.data.col.toView(dataCol);
        e.virtualRow = grid.data.row.toVirtual(dataRow);
        e.virtualCol = grid.data.col.toVirtual(dataCol);
        e.row = dataRow;
        e.col = dataCol;
        return e;
    };
    var _annotateEventInternal = function (e) {
        var dataRow = grid.navigationModel.focus.row;
        var dataCol = grid.navigationModel.focus.col;
        _annotateEventFromDataCoords(e, dataRow, dataCol);
    };
    var annotateEvent = function (e) {
        if (event_loop_1.isAnnotatedKeyEvent(e)) {
            _annotateEventInternal(e);
        }
    };
    grid.eventLoop.addInterceptor(annotateEvent);
    var model = {
        _annotateEvent: annotateEvent
    };
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map