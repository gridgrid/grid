var util = require('@grid/util');
var debounce = require('debounce');

module.exports = (function (_grid) {
    var grid = _grid;
    var model = {top: 0, left: 0};
    var scrollBarWidth = 10;

    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function () {
        model.setScrollSize(grid.virtualPixelCellModel.totalHeight(), grid.virtualPixelCellModel.totalWidth());
        sizeScrollBars();
    });

    model.setScrollSize = function (h, w) {
        model.height = h;
        model.width = w;
    };

    function notifyListeners() {
        //TODO: possibly keep track of delta since last update and send it along. for now, no
        grid.eventLoop.fire('grid-pixel-scroll');
    }

    var debouncedNotify = debounce(notifyListeners, 1);

    model.scrollTo = function (top, left, dontNotify) {
        model.top = util.clamp(top, 0, model.height - grid.viewLayer.viewPort.height);
        model.left = util.clamp(left, 0, model.width - grid.viewLayer.viewPort.width);

        moveScrollBars();

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

    grid.eventLoop.bind('mousewheel', model.handleMouseWheel);

    function scrollBarRender() {
        var div = document.createElement('div');
        div.setAttribute('class', 'grid-scroll-bar');
        return div;
    }

    function makeScrollBarDecorator() {
        var decorator = grid.decorators.create();
        decorator.render = scrollBarRender;
        decorator.units = 'px';
        return decorator;
    }

    model.vertScrollBar = makeScrollBarDecorator();
    model.horzScrollBar = makeScrollBarDecorator();
    model.vertScrollBar.width = scrollBarWidth;
    model.horzScrollBar.height = scrollBarWidth;

    function moveScrollBars() {
        model.vertScrollBar.top = model.top / model.height * grid.viewLayer.viewPort.height;
        model.horzScrollBar.left = model.left / model.width * grid.viewLayer.viewPort.width;
    }

    function sizeScrollBars() {
        model.vertScrollBar.left = grid.viewLayer.viewPort.width - scrollBarWidth;
        model.horzScrollBar.top = grid.viewLayer.viewPort.height - scrollBarWidth;
        model.vertScrollBar.height = grid.viewLayer.viewPort.height / model.height * grid.viewLayer.viewPort.height;
        model.horzScrollBar.width = grid.viewLayer.viewPort.width / model.width * grid.viewLayer.viewPort.width;
    }

    grid.eventLoop.bind('grid-viewport-change', sizeScrollBars);

    grid.decorators.add(model.vertScrollBar);
    grid.decorators.add(model.horzScrollBar);

    return model;
});