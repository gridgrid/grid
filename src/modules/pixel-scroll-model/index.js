var util = require('../util');
var debounce = require('../debounce');
var capitalize = require('capitalize');

module.exports = function(_grid) {
    var grid = _grid;
    var model = {
        top: 0,
        left: 0,
        maxScroll: {},
        maxIsAllTheWayFor: {
            height: false,
            width: false
        }
    };
    var scrollBarWidth = 10;

    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function() {
        var scrollHeight = grid.virtualPixelCellModel.totalHeight() - grid.virtualPixelCellModel.fixedHeight();
        var scrollWidth = grid.virtualPixelCellModel.totalWidth() - grid.virtualPixelCellModel.fixedWidth();
        model.setScrollSize(scrollHeight, scrollWidth);
        cacheMaxScroll();
        sizeScrollBars();
    });


    grid.eventLoop.bind('grid-viewport-change', function() {
        cacheMaxScroll();
        sizeScrollBars();
    });

    function cacheMaxScroll() {
        model.maxScroll.height = getMaxScroll('height');
        model.maxScroll.width = getMaxScroll('width');
    }

    //assumes a standardized wheel event that we create through the mousewheel package
    grid.eventLoop.bind('mousewheel', function handleMouseWheel(e) {
        if (getScrollParent(e.target, grid.container) !== grid.container) {
            return;
        }
        var deltaY = e.deltaY;
        var deltaX = e.deltaX;
        model.scrollTo(model.top - deltaY, model.left - deltaX, true);
        e.preventDefault();
        debouncedNotify();
    });

    model.setScrollSize = function(h, w) {
        model.height = h;
        model.width = w;
    };

    function notifyListeners() {
        //TODO: possibly keep track of delta since last update and send it along. for now, no
        grid.eventLoop.fire('grid-pixel-scroll');

        //update the cell scroll
        var scrollTop = model.top;
        var row = grid.virtualPixelCellModel.getRow(scrollTop + grid.virtualPixelCellModel.fixedHeight()) - grid.rowModel.numFixed();

        var scrollLeft = model.left;
        var col = grid.virtualPixelCellModel.getCol(scrollLeft + grid.virtualPixelCellModel.fixedWidth()) - grid.colModel.numFixed();

        grid.cellScrollModel.scrollTo(row, col, undefined, true);
    }

    var debouncedNotify = debounce(notifyListeners, 1);

    model.scrollTo = function(top, left, dontNotify) {
        model.top = util.clamp(top, 0, model.maxScroll.height);
        model.left = util.clamp(left, 0, model.maxScroll.width);
        positionScrollBars();

        if (!dontNotify) {
            notifyListeners();
        }


    };


    /* SCROLL BAR LOGIC */
    function getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz) {
        var scrollBarTopClick = scrollBarRealClickCoord - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
        var scrollRatio = scrollBarTopClick / getMaxScrollBarCoord(heightWidth, vertHorz);
        var scrollCoord = scrollRatio * model.maxScroll[heightWidth];
        return scrollCoord;
    }

    function makeScrollBarDecorator(isHorz) {
        var decorator = grid.decorators.create();
        var xOrY = isHorz ? 'X' : 'Y';
        var heightWidth = isHorz ? 'width' : 'height';
        var vertHorz = isHorz ? 'horz' : 'vert';
        var gridCoordField = 'grid' + xOrY;
        var layerCoordField = 'layer' + xOrY;
        var viewPortClampFn = grid.viewPort['clamp' + xOrY];

        decorator.postRender = function(scrollBarElem) {
            scrollBarElem.setAttribute('class', 'grid-scroll-bar');
            decorator._onDragStart = function(e) {
                if (e.target !== scrollBarElem) {
                    return;
                }
                var scrollBarOffset = e[layerCoordField];

                decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function(e) {
                    grid.eventLoop.stopBubbling(e);
                    var gridCoord = viewPortClampFn(e[gridCoordField]);
                    var scrollBarRealClickCoord = gridCoord - scrollBarOffset;
                    var scrollCoord = getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz);
                    if (isHorz) {
                        model.scrollTo(model.top, scrollCoord);
                    } else {
                        model.scrollTo(scrollCoord, model.left);
                    }
                });

                decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function() {
                    decorator._unbindDrag();
                    decorator._unbindDragEnd();
                });

                e.stopPropagation();
            };

            grid.eventLoop.bind('grid-drag-start', scrollBarElem, decorator._onDragStart);
            grid.eventLoop.bind('mousedown', scrollBarElem, function(e) {
                grid.eventLoop.stopBubbling(e);
            });

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

    function getMaxScroll(heightWidth) {
        if (model.maxIsAllTheWayFor[heightWidth]) {
            return model[heightWidth] - 1;
        }
        var rowOrCol = heightWidth === 'height' ? 'row' : 'col';
        var scrollLength = model[heightWidth];
        var viewScrollHeightOrWidth = getViewScrollHeightOrWidth(heightWidth);
        var firstScrollableCell = grid[rowOrCol + 'Model'].numFixed();
        while (scrollLength > viewScrollHeightOrWidth - 10) {
            scrollLength -= grid.virtualPixelCellModel[heightWidth](firstScrollableCell); - firstScrollableCell++;
        }
        return model[heightWidth] - scrollLength;

    }

    model._getMaxScroll = getMaxScroll;

    function getScrollRatioFromVirtualScrollCoords(scroll, heightWidth) {
        var maxScroll = model.maxScroll[heightWidth];
        var scrollRatio = scroll / maxScroll;
        return scrollRatio;
    }

    function getMaxScrollBarCoord(heightWidth, vertHorz) {
        return getViewScrollHeightOrWidth(heightWidth) - model[vertHorz + 'ScrollBar'][heightWidth];
    }

    function getRealScrollBarPosition(scroll, heightWidth, vertHorz) {
        var scrollRatio = getScrollRatioFromVirtualScrollCoords(scroll, heightWidth);
        var maxScrollBarScroll = getMaxScrollBarCoord(heightWidth, vertHorz);
        //in scroll bar coords
        var scrollBarCoord = scrollRatio * maxScrollBarScroll;
        //add the fixed height to translate back into real coords
        return scrollBarCoord + grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
    }

    model._getRealScrollBarPosition = getRealScrollBarPosition;
    model._getScrollPositionFromReal = getScrollPositionFromReal;

    function calcScrollBarRealTop() {
        return getRealScrollBarPosition(model.top, 'height', 'vert');
    }

    function calcScrollBarRealLeft() {
        return getRealScrollBarPosition(model.left, 'width', 'horz');
    }

    function positionScrollBars() {
        model.vertScrollBar.top = calcScrollBarRealTop();
        model.horzScrollBar.left = calcScrollBarRealLeft();
    }

    function getViewScrollHeightOrWidth(heightWidth) {
        return grid.viewPort[heightWidth] - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
    }

    function getScrollableViewWidth() {
        return getViewScrollHeightOrWidth('width');
    }

    function getScrollableViewHeight() {
        return getViewScrollHeightOrWidth('height');
    }

    function sizeScrollBars() {
        model.vertScrollBar.left = grid.viewPort.width - scrollBarWidth;
        model.horzScrollBar.top = grid.viewPort.height - scrollBarWidth;
        var scrollableViewHeight = getScrollableViewHeight();
        var scrollableViewWidth = getScrollableViewWidth();
        model.vertScrollBar.height = Math.max(scrollableViewHeight / grid.virtualPixelCellModel.totalHeight() * scrollableViewHeight, 20);
        model.horzScrollBar.width = Math.max(scrollableViewWidth / grid.virtualPixelCellModel.totalWidth() * scrollableViewWidth, 20);
        if (model.vertScrollBar.height >= scrollableViewHeight) {
            model.vertScrollBar.height = -1;
        }

        if (model.horzScrollBar.width >= scrollableViewWidth) {
            model.horzScrollBar.width = -1;
        }
        positionScrollBars();
    }

    grid.decorators.add(model.vertScrollBar);
    grid.decorators.add(model.horzScrollBar);
    /* END SCROLL BAR LOGIC */

    function getScrollParent(elem, stopParent) {
        stopParent = stopParent || document;
        if (!elem) {
            return stopParent;
        }

        var position = elem.style.position,
            excludeStaticParent = position === 'absolute',
            overflowRegex = /(auto|scroll)/,
            scrollParent = elem;

        while (!!(scrollParent = scrollParent.parentElement) && scrollParent !== stopParent) {
            if (excludeStaticParent && scrollParent.style.position === 'static') {
                continue;
            }

            var computedStyle = getComputedStyle(scrollParent);

            if (overflowRegex.test(computedStyle.overflow + computedStyle.overflowY + computedStyle.overflowX)) {
                break;
            }
        }

        return position === 'fixed' || !scrollParent || scrollParent === elem ? elem.ownerDocument || stopParent : scrollParent;
    }

    return model;
};