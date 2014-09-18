var util = require('@grid/util');

module.exports = (function (_grid) {
    var grid = _grid;
    var model = {top: 0, left: 0};

    model.setScrollSize = function (h, w) {
        model.height = h;
        model.width = w;
    };

    model.scrollTo = function (top, left) {
        model.top = util.clamp(top, 0, model.height - grid.viewLayer.viewPort.height);
        model.left = util.clamp(left, 0, model.width - grid.viewLayer.viewPort.width);
    };

    return model;
})