var util = require('@grid/util');
var debounce = require('debounce');

module.exports = (function (_grid) {
    var grid = _grid;
    var model = {top: 0, left: 0};
    var scrollListeners = require('@grid/listeners')();

    model.addListener = scrollListeners.addListener;

    grid.virtualPixelCellModel.addListener(function () {
        model.setScrollSize(grid.virtualPixelCellModel.totalHeight(), grid.virtualPixelCellModel.totalWidth());
    });

    model.setScrollSize = function (h, w) {
        model.height = h;
        model.width = w;
    };

    function notifyListeners() {
        //TODO: possibly keep track of delta since last update and send it along. for now, no
        scrollListeners.notify();
    }

    var debouncedNotify = debounce(notifyListeners, 1);

    model.scrollTo = function (top, left, dontNotify) {
        model.top = util.clamp(top, 0, model.height - grid.viewLayer.viewPort.height);
        model.left = util.clamp(left, 0, model.width - grid.viewLayer.viewPort.width);

        if (!dontNotify) {
            notifyListeners();
        }
    };

    //assumes a standardized wheel event that we create through the mousewheel package
    model.handleMouseWheel = function (e) {
        model.scrollTo(model.top - e.deltaY, model.left - e.deltaX, true);
        debouncedNotify();
        e.preventDefault();
    };

    return model;
});