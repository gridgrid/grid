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
        model.top = util.clamp(top, 0, model.height - grid.viewPort.height);
        model.left = util.clamp(left, 0, model.width - grid.viewPort.width);

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
        var viewPortClampFn = grid.viewPort['clamp' + xOrY];

        decorator.render = function () {
            var scrollBarElem = document.createElement('div');
            scrollBarElem.setAttribute('class', 'grid-scroll-bar');
            decorator._onDragStart = function (e) {
                if (e.target !== scrollBarElem) {
                    return;
                }
                var screenClientOffset = e[screenCoordField] - e[clientCoordField];
                var scrollBarOffset = e[layerCoordField];

                decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
                    var screenCoord = e[screenCoordField];
                    var clientCoord = viewPortClampFn(e[clientCoordField]);
                    var scrollCoord = realPxToVirtualPx(clientCoord - scrollBarOffset, widthOrHeight);
                    if (isHorz) {
                        model.scrollTo(model.top, scrollCoord);
                    } else {
                        model.scrollTo(scrollCoord, model.left);
                    }
                });

                decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
                    decorator._unbindDrag();
                    decorator._unbindDragEnd();
                });

                e.stopPropagation();
            };

            grid.eventLoop.bind('grid-drag-start', scrollBarElem, decorator._onDragStart);

            return scrollBarElem;
        };

        decorator.units = 'px';
        decorator.space = 'real';

        return decorator;
    }

    model.vertScrollBar = makeScrollBarDecorator();
    model.horzScrollBar = makeScrollBarDecorator(true);
    model.vertScrollBar.width = scrollBarWidth;
    model.horzScrollBar.height = scrollBarWidth;

    function virtualPxToRealPx(virtualPx, heightWidth) {
        return virtualPx / model[heightWidth] * grid.viewPort[heightWidth];
    }

    function realPxToVirtualPx(realPx, heightWidth) {
        return realPx / grid.viewPort[heightWidth] * model[heightWidth];
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
        return grid.viewPort.height / model.height * grid.viewPort.height;
    }

    function sizeScrollBars() {
        model.vertScrollBar.left = grid.viewPort.width - scrollBarWidth;
        model.horzScrollBar.top = grid.viewPort.height - scrollBarWidth;
        model.vertScrollBar.height = calcScrollBarHeight();
        model.horzScrollBar.width = grid.viewPort.width / model.width * grid.viewPort.width;
    }

    grid.decorators.add(model.vertScrollBar);
    grid.decorators.add(model.horzScrollBar);
    /* END SCROLL BAR LOGIC */

    return model;
};