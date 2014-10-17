var mockEvent = require('@grid/custom-event');

describe('pixel-scroll-model', function () {
    var $ = require('jquery');
    var helper = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    function beforeEachFn(varyH, varyW, fixedR, fixedC) {
        grid = helper.buildSimpleGrid(numRows, numCols, varyH, varyW, fixedR, fixedC);
        model = grid.pixelScrollModel;
    }

    beforeEach(beforeEachFn);

    it('should have a top and left value that start at 0', function () {
        expect(model.top).toEqual(0);
        expect(model.left).toEqual(0);
    });

    it('should let you "scroll" to a pixel', function () {
        model.scrollTo(5, 6);
        expect(model.top).toEqual(5);
        expect(model.left).toEqual(6);
    });

    it('should let you set a scroll height and width', function () {
        model.setScrollSize(100, 200);
        expect(model.height).toEqual(100);
        expect(model.width).toEqual(200);
    });

    it('should not include fixed width or height in its scroll size', function () {
        beforeEachFn(false, false, 2, 3);
        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
        expect(model).heightToBe(numRows * 30 - 2 * 30);
        expect(model).widthToBe(numCols * 100 - 3 * 100);
    });

    it('should not let you scroll below 0', function () {
        model.scrollTo(-5, 5);
        expect(model.top).toEqual(0);
        expect(model.left).toEqual(5);
        model.scrollTo(5, -5);
        expect(model.top).toEqual(5);
        expect(model.left).toEqual(0);
    });

    it('should not let you scroll above the current view', function () {
        model.setScrollSize(100, 200);
        grid.viewPort.width = 10;
        grid.viewPort.height = 5;

        model.scrollTo(1000, 10);
        expect(model.top).toEqual(95);
        expect(model.left).toEqual(10);

        model.scrollTo(10, 1000);
        expect(model.top).toEqual(10);
        expect(model.left).toEqual(190);
    });

    function sendMouseWheelToModel(y, x) {
        var event = require('@grid/custom-event')('mousewheel');
        event.deltaY = y;
        event.deltaX = x;
        event = require('@grid/mousewheel').normalize(event);
        grid.eventLoop.fire(event);
        return event;
    }

    it('should handle a mousewheel event and offset the scroll accordingly', function () {
        //mock the event to look like our standardized one
        sendMouseWheelToModel(40, 30);
        expect(model.top).toEqual(40);
        expect(model.left).toEqual(30);

    });

    it('should call a scroll listener on scrollTo', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-pixel-scroll', spy);
        model.scrollTo(5, 6);
        expect(spy).toHaveBeenCalled();
    });

    it('should not call a scroll listener synchronously on mousewheel', function () {
        var spy = jasmine.createSpy();
        var unbind = grid.eventLoop.bind('grid-pixel-scroll', spy);
        sendMouseWheelToModel(40, 30);
        expect(spy).not.toHaveBeenCalled();
    });

    it('should call a scroll listener asynchronously on mousewheel', function () {
        var spy = jasmine.createSpy();
        grid.eventLoop.bind('grid-pixel-scroll', spy);
        sendMouseWheelToModel(40, 30);
        waits(10);
        runs(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should prevent default on events', function () {
        var event = sendMouseWheelToModel(0, 0);
        expect(event.defaultPrevented).toBe(true);
    });

    it('should set its width and height on creation', function () {
        expect(model.width).toBe(10 * 100);
        expect(model.height).toBe(100 * 30);
    });
    describe('scroll bars', function () {
        //weird numbers so we don't get confused by even division
        var viewWidth = 531;
        var viewHeight = 233;
        var scrollBeforeEachFn = function () {
            grid.viewPort.sizeToContainer({offsetWidth: viewWidth, offsetHeight: viewHeight});
        };
        beforeEach(scrollBeforeEachFn);

        it('should register a vertical and horizontal decorator', function () {
            expect(model.vertScrollBar.units).toBe('px');
            expect(model.vertScrollBar.space).toBe('real');
            expect(model.horzScrollBar.units).toBe('px');
            expect(model.horzScrollBar.space).toBe('real');
            expect(grid.decorators.getAlive()).toContain(model.vertScrollBar);
            expect(grid.decorators.getAlive()).toContain(model.horzScrollBar);
        });

        function expectRenderToBeAScrollBar(div) {
            expect(div).toBeAnElement();
            expect($(div).hasClass('grid-scroll-bar')).toBe(true);
        }

        it('should render a div with a scroll bar class', function () {
            expectRenderToBeAScrollBar(model.vertScrollBar.render());
            expectRenderToBeAScrollBar(model.horzScrollBar.render());
        });

        function getViewHeight() {
            return viewHeight - grid.virtualPixelCellModel.fixedHeight();
        }

        function getViewWidth() {
            return viewWidth - grid.virtualPixelCellModel.fixedWidth();
        }

        function getScrollHeight() {
            return grid.virtualPixelCellModel.totalHeight() - grid.virtualPixelCellModel.fixedHeight();
        }

        function getScrollBarHeight() {
            return getViewHeight() / getScrollHeight() * getViewHeight();
        }

        function getScrollWidth() {
            return grid.virtualPixelCellModel.totalWidth() - grid.virtualPixelCellModel.fixedWidth();
        }

        function getScrollBarWidth() {
            return getViewWidth() / getScrollWidth() * getViewWidth();
        }

        it('should size to the right percentage of the view', function () {

            expect(model.vertScrollBar).heightToBe(getScrollBarHeight());
            expect(model.vertScrollBar).widthToBe(10);
            expect(model.horzScrollBar).widthToBe(getScrollBarWidth());
            expect(model.horzScrollBar).heightToBe(10);
        });

        it('should size to the right percentage of the view accounting for fixed width and height', function () {
            beforeEachFn(false, false, 2, 3);
            scrollBeforeEachFn();
            expect(model.vertScrollBar).heightToBe(getScrollBarHeight());
            expect(model.vertScrollBar).widthToBe(10);
            expect(model.horzScrollBar).widthToBe(getScrollBarWidth());
            expect(model.horzScrollBar).heightToBe(10);
        });

        it('should position at the edges of the view', function () {
            expect(model.vertScrollBar.left).toBe(viewWidth - 10);
            expect(model.horzScrollBar.top).toBe(viewHeight - 10);
        });

        it('should start out at the top and left', function () {
            expect(model.vertScrollBar).topToBe(0);
            expect(model.horzScrollBar).leftToBe(0);
        });

        it('should start out at the top and left of the unfixed area', function () {
            beforeEachFn(false, false, 2, 3);
            expect(model.vertScrollBar).topToBe(2 * 30);
            expect(model.horzScrollBar).leftToBe(3 * 100);
        });


        it('should change top and left positions on scroll', function () {
            model.scrollTo(13, 23);
            expect(model.vertScrollBar).topToBe(13 / grid.virtualPixelCellModel.totalHeight() * viewHeight);
            expect(model.horzScrollBar).leftToBe(23 / grid.virtualPixelCellModel.totalWidth() * viewWidth);
        });

        it('should bind a drag event on render', function () {
            var spy = spyOn(grid.eventLoop, 'bind');
            var scrollBar = model.vertScrollBar.render();
            expect(spy.argsForCall[0][0]).toEqual('grid-drag-start');
            expect(spy.argsForCall[0][1]).toBe(scrollBar);
            expect(spy.argsForCall[0][2]).toBeAFunction();
        });

        function renderBar(barDecorator) {
            var bar = barDecorator.render();
            helper.container.appendChild(bar);
            return bar;
        }

        function fireDragStart(bar, dragStart, decorator) {
            bar.dispatchEvent(dragStart);
            //call the handler directly or we get all kinds of crazy
            decorator._onDragStart(dragStart);
        }

        function renderBarAndFireDragStart(preFireFn) {
            var bar = renderBar(model.vertScrollBar);
            var dragStart = mockEvent('grid-drag-start', true);
            if (preFireFn) {
                preFireFn();
            }
            //he dispatch is just to set the target the grid doesnt actually listend for these so we still have to manually fire it
            fireDragStart(bar, dragStart, model.vertScrollBar);
        }

        it('should bind drag and drag-end on drag-start', function () {
            var bind;
            renderBarAndFireDragStart(function () {
                bind = spyOn(grid.eventLoop, 'bind').andCallThrough();
            });
            //these start at 2 because the mousemodel binds first
            expect(bind).toHaveBeenCalled();
            expect(bind.argsForCall[0][0]).toEqual('grid-drag');
            expect(bind.argsForCall[0][1]).toBeAFunction();
            expect(bind.argsForCall[1][0]).toEqual('grid-drag-end');
            expect(bind.argsForCall[1][1]).toBeAFunction();


        });

        function scrollBy(mouseDownClient, scrollAmount, screenOffset, previousScroll, scrollBarOffset, isHorz) {
            var move = mockEvent('grid-drag', true);
            var scrollClient = mouseDownClient + scrollAmount;

            move.clientY = scrollClient;
            move.clientX = scrollClient;
            move.screenY = scrollClient + screenOffset;
            move.screenX = scrollClient + screenOffset;
            //expect(model.top).toBe(previousScroll / viewHeight * grid.virtualPixelCellModel.totalHeight());
            grid.eventLoop.fire(move);

            var actualScroll = isHorz ? model.left : model.top;
            var view = isHorz ? viewWidth : viewHeight;
            var total = isHorz ? grid.virtualPixelCellModel.totalWidth() : grid.virtualPixelCellModel.totalHeight();
            expect(actualScroll).toBe((scrollClient - scrollBarOffset) / view * total);
        }


        function sendScrollToBar(bar, scrolls, scrollBarPosition, isHorz, decorator) {
            var start = mockEvent('grid-drag-start');
            var scrollBarOffset = Math.floor(isHorz ? getScrollBarWidth() : getScrollBarHeight() / 2);
            var mouseDownClient = scrollBarPosition + scrollBarOffset;
            var screenYOffset = 11;
            start.clientY = mouseDownClient;
            start.clientX = mouseDownClient;
            start.layerY = scrollBarOffset;
            start.layerX = scrollBarOffset;
            var mouseDownScreen = mouseDownClient + screenYOffset;
            start.screenY = mouseDownScreen;
            start.screenX = mouseDownScreen;
            //x shouldn't matter

            fireDragStart(bar, start, decorator);

            scrolls.forEach(function (scroll, i) {
                var newScroll = scrollBarPosition + scroll;
                scrollBy(mouseDownClient, newScroll, screenYOffset, scrolls[i - 1] || scrollBarPosition, scrollBarOffset, isHorz);
                scrollBarPosition += scroll;
            });

            fireMouseUp(bar);
            return scrollBarPosition;
        }

        it('should scroll with mousemove', function () {
            var vertBar = renderBar(model.vertScrollBar);
            //send two scrolls to ensure it doesn't reset in between (cause that was a bug)
            var top = sendScrollToBar(vertBar, [4, 6, 3, 2, -1], 0, false, model.vertScrollBar);
            sendScrollToBar(vertBar, [2, 5, 6], top, false, model.vertScrollBar);


            var horzBar = renderBar(model.horzScrollBar);
            //send two scrolls to ensure it doesn't reset in between (cause that was a bug)
            var left = sendScrollToBar(horzBar, [2, 8, -1, 3, 2], 0, true, model.horzScrollBar);
            sendScrollToBar(horzBar, [5, 2, 9], left, true, model.horzScrollBar);
        });

        function fireMouseUp() {

            var end = mockEvent('grid-drag-end');
            grid.eventLoop.fire(end);
        }

        it('should unbind on mouseup', function () {
            var unbind;
            renderBarAndFireDragStart();
            var dragSpy = spyOn(model.vertScrollBar, '_unbindDrag');
            var endSpy = spyOn(model.vertScrollBar, '_unbindDragEnd');
            fireMouseUp();
            expect(dragSpy).toHaveBeenCalled();
            expect(endSpy).toHaveBeenCalled();
        });
    });


});