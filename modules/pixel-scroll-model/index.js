"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_clean_1 = require("../dirty-clean");
var util = require("../util");
function create(grid) {
    var pixelDirtyClean = dirty_clean_1.default(grid);
    var offsetDirtyClean = dirty_clean_1.default(grid);
    var scrollBarWidth = 10;
    var intentionAngle = 30;
    function makeDimension(gridDimension, gridCrossDimension) {
        function getViewScrollSize() {
            return gridDimension.viewPort.size - gridDimension.virtualPixelCell.fixedSize();
        }
        function getScrollRatioFromVirtualScrollCoords(scroll) {
            var maxScroll = pixelScrollDimension.maxScroll;
            var scrollRatio = scroll / maxScroll;
            return scrollRatio;
        }
        function getRealScrollBarPosition(scroll) {
            var scrollRatio = getScrollRatioFromVirtualScrollCoords(scroll);
            var maxScrollBarScroll = getMaxScrollBarCoord();
            var scrollBarCoord = scrollRatio * maxScrollBarScroll;
            return scrollBarCoord + gridDimension.virtualPixelCell.fixedSize();
        }
        function getMaxScroll() {
            if (pixelScrollDimension.maxIsAllTheWay) {
                return Math.max(0, pixelScrollDimension.scrollSize - gridDimension.virtualPixelCell.sizeOf(gridDimension.rowColModel.length(true) - 1));
            }
            var scrollLength = pixelScrollDimension.scrollSize;
            var viewScrollSize = getViewScrollSize();
            if (scrollLength <= viewScrollSize) {
                return 0;
            }
            var firstScrollableCell = gridDimension.rowColModel.numFixed();
            while (scrollLength > viewScrollSize - 10 && firstScrollableCell < gridDimension.rowColModel.length(true)) {
                scrollLength -= gridDimension.virtualPixelCell.sizeOf(firstScrollableCell);
                firstScrollableCell++;
            }
            return pixelScrollDimension.scrollSize - scrollLength;
        }
        function getMaxScrollBarCoord() {
            return getViewScrollSize() - (gridDimension.positionRange.getSize(pixelScrollDimension.scrollBar) || scrollBarWidth);
        }
        function getScrollPositionFromReal(scrollBarRealClickCoord) {
            var scrollBarTopClick = scrollBarRealClickCoord - gridDimension.virtualPixelCell.fixedSize();
            var scrollRatio = scrollBarTopClick / getMaxScrollBarCoord();
            var scrollCoord = scrollRatio * pixelScrollDimension.maxScroll;
            return scrollCoord;
        }
        function makeScrollBarDecorator() {
            var decorator = grid.decorators.create();
            decorator.fixed = true;
            var viewPortClampFn = gridDimension.viewPort.clampPx;
            decorator.postRender = function (scrollBarElem) {
                scrollBarElem.setAttribute('class', 'grid-scroll-bar');
                scrollBarElem.setAttribute('style', scrollBarElem.getAttribute('style') + " border-radius: 6px;\n                background: rgba(0, 0, 0, .5);\n                z-index: 10;");
                decorator._onDragStart = function (e) {
                    if (e.target !== scrollBarElem) {
                        return;
                    }
                    var scrollBarOffset = gridDimension.cellMouse.layerPx(e);
                    decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (gridDragEvent) {
                        grid.eventLoop.stopBubbling(gridDragEvent);
                        var gridCoord = viewPortClampFn(gridDimension.cellMouse.gridPx(gridDragEvent));
                        var scrollBarRealClickCoord = gridCoord - scrollBarOffset;
                        var scrollCoord = getScrollPositionFromReal(scrollBarRealClickCoord);
                        pixelScrollDimension.scrollTo(scrollCoord);
                    });
                    decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
                        if (decorator._unbindDrag) {
                            decorator._unbindDrag();
                        }
                        if (decorator._unbindDragEnd) {
                            decorator._unbindDragEnd();
                        }
                    });
                    e.stopPropagation();
                };
                grid.eventLoop.bind(scrollBarElem, 'grid-drag-start', decorator._onDragStart);
                grid.eventLoop.bind(scrollBarElem, 'mousedown', function (e) {
                    grid.eventLoop.stopBubbling(e);
                });
                return scrollBarElem;
            };
            decorator.units = 'px';
            decorator.space = 'real';
            gridCrossDimension.positionRange.setSize(decorator, scrollBarWidth);
            return decorator;
        }
        var pixelScrollDimension = {
            position: 0,
            offset: 0,
            maxScroll: 0,
            scrollSize: 0,
            maxIsAllTheWay: false,
            scrollTo: function (px, dontNotify) {
                pixelScrollDimension.position = util.clamp(px, 0, pixelScrollDimension.maxScroll);
                pixelScrollDimension.positionScrollBar();
                pixelScrollDimension.updatePixelOffset();
                if (!dontNotify) {
                    notifyListeners();
                }
            },
            updatePixelOffset: function () {
                var modPixels = 0;
                if (!grid.opts.snapToCell) {
                    var fixedSize = gridDimension.virtualPixelCell.fixedSize();
                    var rawCell = gridDimension.virtualPixelCell.toCellFromPx(pixelScrollDimension.position + fixedSize);
                    var cell = rawCell - gridDimension.rowColModel.numFixed();
                    var startCell = gridDimension.rowColModel.numFixed();
                    var endCell = cell + gridDimension.rowColModel.numFixed() - 1;
                    var position = gridDimension.virtualPixelCell.sizeOf(startCell, endCell);
                    modPixels = position - pixelScrollDimension.position;
                }
                if (pixelScrollDimension.offset !== modPixels) {
                    offsetDirtyClean.setDirty();
                }
                pixelScrollDimension.offset = modPixels;
            },
            scrollBar: makeScrollBarDecorator(),
            positionScrollBar: function () {
                gridDimension.positionRange.setPosition(pixelScrollDimension.scrollBar, getRealScrollBarPosition(pixelScrollDimension.position));
            },
            calcCellScrollPosition: function () {
                var position = pixelScrollDimension.position;
                var rawCell = gridDimension.virtualPixelCell.toCellFromPx(position + gridDimension.virtualPixelCell.fixedSize());
                return rawCell - gridDimension.rowColModel.numFixed();
            },
            sizeScrollBar: function () {
                gridCrossDimension.positionRange.setPosition(pixelScrollDimension.scrollBar, gridCrossDimension.viewPort.size - scrollBarWidth);
                var scrollableViewSize = getViewScrollSize();
                var scrollBarSize = Math.max(scrollableViewSize / gridDimension.virtualPixelCell.totalSize() * scrollableViewSize, 20);
                gridDimension.positionRange.setSize(pixelScrollDimension.scrollBar, scrollBarSize);
                if (scrollBarSize >= scrollableViewSize) {
                    gridDimension.positionRange.setSize(pixelScrollDimension.scrollBar, -1);
                }
            },
            cacheMaxScroll: function () {
                pixelScrollDimension.maxScroll = getMaxScroll();
            },
            cacheScrollSize: function () {
                pixelScrollDimension.scrollSize = gridDimension.virtualPixelCell.totalSize() - gridDimension.virtualPixelCell.fixedSize();
            },
            _getMaxScroll: getMaxScroll
        };
        return pixelScrollDimension;
    }
    var dimensions = {
        y: makeDimension(grid.rows, grid.cols),
        x: makeDimension(grid.cols, grid.rows),
    };
    var model = {
        get height() {
            return dimensions.y.scrollSize;
        },
        get width() {
            return dimensions.x.scrollSize;
        },
        get top() {
            return dimensions.y.position;
        },
        get left() {
            return dimensions.x.position;
        },
        get offsetTop() {
            return dimensions.y.offset;
        },
        get offsetLeft() {
            return dimensions.x.offset;
        },
        get vertScrollBar() {
            return dimensions.y.scrollBar;
        },
        get horzScrollBar() {
            return dimensions.x.scrollBar;
        },
        maxScroll: {
            get height() {
                return dimensions.y.scrollSize;
            },
            get width() {
                return dimensions.x.scrollSize;
            }
        },
        maxIsAllTheWayFor: {
            get height() {
                return dimensions.y.maxIsAllTheWay;
            },
            set height(h) {
                dimensions.y.maxIsAllTheWay = h;
            },
            get width() {
                return dimensions.x.maxIsAllTheWay;
            },
            set width(h) {
                dimensions.x.maxIsAllTheWay = h;
            },
        },
        isDirty: pixelDirtyClean.isDirty,
        isOffsetDirty: offsetDirtyClean.isDirty,
        setScrollSize: function (h, w) {
            model.y.scrollSize = h;
            model.x.scrollSize = w;
        },
        scrollTo: function (top, left, dontNotify) {
            model.y.scrollTo(top, true);
            model.x.scrollTo(left, true);
            if (!dontNotify) {
                notifyListeners();
            }
        },
        _getMaxScroll: function (heightOrWidth) {
            var dimension = heightOrWidth === 'height' ? model.y : model.x;
            return dimension._getMaxScroll();
        },
        y: dimensions.y,
        x: dimensions.x,
    };
    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function () {
        model.y.cacheScrollSize();
        model.x.cacheScrollSize();
        cacheMaxScroll();
        sizeScrollBars();
        updatePixelOffsets();
    });
    grid.eventLoop.bind('grid-viewport-change', function () {
        cacheMaxScroll();
        sizeScrollBars();
        updatePixelOffsets();
    });
    function cacheMaxScroll() {
        model.y.cacheMaxScroll();
        model.x.cacheMaxScroll();
    }
    function checkAngle(side1, side2) {
        var angle = Math.abs(Math.atan(side1 / side2) * 57.29);
        return angle < intentionAngle;
    }
    grid.eventLoop.bind('mousewheel', function (e) {
        if (e.target !== grid.container && getScrollElementFromTarget(e.target, grid.container) !== grid.container) {
            return;
        }
        var deltaY = e.deltaY;
        var deltaX = e.deltaX;
        if (checkAngle(deltaY, deltaX)) {
            deltaY = 0;
        }
        else if (checkAngle(deltaX, deltaY)) {
            deltaX = 0;
        }
        model.scrollTo(model.top - deltaY, model.left - deltaX, false);
        e.preventDefault();
    });
    function notifyListeners() {
        grid.eventLoop.fire('grid-pixel-scroll');
        grid.cellScrollModel.scrollTo(model.y.calcCellScrollPosition(), model.x.calcCellScrollPosition(), undefined, true);
        pixelDirtyClean.setDirty();
    }
    function sizeScrollBars() {
        model.y.sizeScrollBar();
        model.x.sizeScrollBar();
        positionScrollBars();
    }
    function positionScrollBars() {
        model.y.positionScrollBar();
        model.x.positionScrollBar();
    }
    function updatePixelOffsets() {
        model.y.updatePixelOffset();
        model.x.updatePixelOffset();
    }
    grid.decorators.add(model.y.scrollBar);
    grid.decorators.add(model.x.scrollBar);
    var hasStyle = function (elem) { return !!elem.style; };
    function getScrollElementFromTarget(elem, stopParent) {
        stopParent = stopParent || document;
        if (!elem || !(hasStyle(elem))) {
            return stopParent;
        }
        var position = elem.style.position;
        var excludeStaticParent = position === 'absolute';
        var overflowRegex = /(auto|scroll)/;
        var scrollParent = elem;
        while (!!scrollParent && scrollParent !== stopParent) {
            if (!(excludeStaticParent && scrollParent.style.position === 'static')) {
                var computedStyle = getComputedStyle(scrollParent);
                if (overflowRegex.test('' + computedStyle.overflow + computedStyle.overflowY + computedStyle.overflowX)) {
                    break;
                }
            }
            scrollParent = scrollParent.parentElement;
        }
        return position === 'fixed' || !scrollParent || scrollParent === elem ? elem.ownerDocument || stopParent : scrollParent;
    }
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map