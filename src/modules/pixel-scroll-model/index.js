var util = require('@grid/util');
var debounce = require('debounce');

module.exports = function (_grid) {
    var grid = _grid;
    var model = {top: 0, left: 0};
    var scrollBarWidth = 10;

    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function () {
        model.setScrollSize(grid.virtualPixelCellModel.totalHeight(), grid.virtualPixelCellModel.totalWidth());
        sizeScrollBars();
    });

    grid.eventLoop.bind('grid-viewport-change', sizeScrollBars);
    //assumes a standardized wheel event that we create through the mousewheel package
    grid.eventLoop.bind('mousewheel', function handleMouseWheel(e) {
        var deltaY = e.deltaY;
        var deltaX = e.deltaX;
        model.scrollTo(model.top - deltaY, model.left - deltaX, true);
        debouncedNotify();
        e.preventDefault();
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


    /* SCROLL BAR LOGIC */
    function makeScrollBarDecorator(isHorz) {
        var xOrY = isHorz ? 'X' : 'Y';
        var widthOrHeight = isHorz ? 'width' : 'height';
        var decorator = grid.decorators.create();
        var screenCoordField = 'screen' + xOrY;
        var clientCoordField = 'client' + xOrY;
        var layerCoordField = 'layer' + xOrY;
        var viewPortClampFn = grid.viewLayer.viewPort['clamp' + xOrY];

        decorator.render = function () {
            var scrollBarElem = document.createElement('div');
            scrollBarElem.setAttribute('class', 'grid-scroll-bar');

            grid.eventLoop.bind('mousedown', scrollBarElem, function (e) {

                var screenClientOffset = e[screenCoordField] - e[clientCoordField];
                var scrollBarOffset = e[layerCoordField];

                var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
                    var screenCoord = e[screenCoordField];
                    var clientCoord = viewPortClampFn(screenCoord - screenClientOffset);
                    var scrollCoord = realPxToVirtualPx(clientCoord - scrollBarOffset, widthOrHeight);
                    if (isHorz) {
                        model.scrollTo(model.top, scrollCoord);
                    } else {
                        model.scrollTo(scrollCoord, model.left);
                    }
                });

                var unbindUp = grid.eventLoop.bind('mouseup', window, function (e) {
                    unbindMove();
                    unbindUp();
                });

                //keep it from doing weird crap
                e.preventDefault();
            });

            return scrollBarElem;
        };

        decorator.units = 'px';
        return decorator;
    }

    model.vertScrollBar = makeScrollBarDecorator();
    model.horzScrollBar = makeScrollBarDecorator(true);
    model.vertScrollBar.width = scrollBarWidth;
    model.horzScrollBar.height = scrollBarWidth;

    function virtualPxToRealPx(virtualPx, heightWidth) {
        return virtualPx / model[heightWidth] * grid.viewLayer.viewPort[heightWidth];
    }

    function realPxToVirtualPx(realPx, heightWidth) {
        return realPx / grid.viewLayer.viewPort[heightWidth] * model[heightWidth];
    }

    function calcScrollBarTop() {
        return virtualPxToRealPx(model.top, 'height');
    }

    function calcScrollBarLeft() {
        return virtualPxToRealPx(model.left, 'width');
    }

    function moveScrollBars() {
        model.vertScrollBar.top = calcScrollBarTop();
        model.horzScrollBar.left = calcScrollBarLeft();
    }

    function calcScrollBarHeight() {
        return grid.viewLayer.viewPort.height / model.height * grid.viewLayer.viewPort.height;
    }

    function sizeScrollBars() {
        model.vertScrollBar.left = grid.viewLayer.viewPort.width - scrollBarWidth;
        model.horzScrollBar.top = grid.viewLayer.viewPort.height - scrollBarWidth;
        model.vertScrollBar.height = calcScrollBarHeight();
        model.horzScrollBar.width = grid.viewLayer.viewPort.width / model.width * grid.viewLayer.viewPort.width;
    }

    grid.decorators.add(model.vertScrollBar);
    grid.decorators.add(model.horzScrollBar);
    /* END SCROLL BAR LOGIC */

    return model;
};