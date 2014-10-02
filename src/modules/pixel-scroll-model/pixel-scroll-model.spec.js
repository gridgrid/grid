var mockEvent = require('@grid/custom-event');

describe('pixel-scroll-model', function () {
    var $ = require('jquery');
    var core = require('@grid/grid-spec-helper')();
    var model;
    var numRows = 100;
    var numCols = 10;
    var grid;

    beforeEach(function () {
        grid = core.buildSimpleGrid(numRows, numCols);
        model = grid.pixelScrollModel;
    });

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
        grid.viewLayer.viewPort.width = 10;
        grid.viewLayer.viewPort.height = 5;

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
        var unbind = grid.eventLoop.bind('grid-pixel-scroll', spy);
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
        var unbind = grid.eventLoop.bind('grid-pixel-scroll', spy);
        sendMouseWheelToModel(40, 30);
        waits(10);
        runs(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should prevent default on events', function () {
        var event = sendMouseWheelToModel(0, 0);
        expect(event.isDefaultPrevented()).toBe(true);
    });

    it('should set its width and height on creation', function () {
        expect(model.width).toBe(10 * 100);
        expect(model.height).toBe(100 * 30);
    });
    describe('scroll bars', function () {
        //weird numbers so we don't get confused by even division
        var viewWidth = 531;
        var viewHeight = 233;
        beforeEach(function () {
            grid.viewLayer.viewPort.sizeToContainer({offsetWidth: viewWidth, offsetHeight: viewHeight});
        });

        it('should register a vertical and horizontal decorator', function () {
            expect(model.vertScrollBar.units).toBe('px');
            expect(model.horzScrollBar.units).toBe('px');
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

        function getScrollBarHeight() {
            return viewHeight / grid.virtualPixelCellModel.totalHeight() * viewHeight;
        }

        function getScrollBarWidth() {
            return viewWidth / grid.virtualPixelCellModel.totalWidth() * viewWidth;
        }

        it('should size to the right percentage of the view', function () {

            expect(model.vertScrollBar.height).toBe(getScrollBarHeight());
            expect(model.vertScrollBar.width).toBe(10);
            expect(model.horzScrollBar.width).toBe(getScrollBarWidth());
            expect(model.horzScrollBar.height).toBe(10);
        });

        it('should position at the edges of the view', function () {
            expect(model.vertScrollBar.left).toBe(viewWidth - 10);
            expect(model.horzScrollBar.top).toBe(viewHeight - 10);
        });

        it('should change top and left positions on scroll', function () {
            model.scrollTo(13, 23);
            expect(model.vertScrollBar.top).toBe(13 / grid.virtualPixelCellModel.totalHeight() * viewHeight);
            expect(model.horzScrollBar.left).toBe(23 / grid.virtualPixelCellModel.totalWidth() * viewWidth);
        });

        it('should bind mousedown events on render', function () {
            var spy = spyOn(grid.eventLoop, 'bind');
            model.vertScrollBar.render();
            expect(spy.argsForCall[0][0]).toEqual('mousedown');
            expect(spy.argsForCall[0][1]).toBeAnElement();
            expect(spy.argsForCall[0][2]).toBeAFunction();
        });

        it('should bind mousedown and mouseup to the window on mousedown and prevent default', function () {
            var bar = model.vertScrollBar.render();
            var mousedown = mockEvent('mousedown');
            var bind = spyOn(grid.eventLoop, 'bind').andCallThrough();
            var preventDefault = spyOn(mousedown, 'preventDefault').andCallThrough();
            bar.dispatchEvent(mousedown);
            expect(bind.argsForCall[0][0]).toEqual('mousemove');
            expect(bind.argsForCall[0][1]).toBe(window);
            expect(bind.argsForCall[0][2]).toBeAFunction();
            expect(bind.argsForCall[1][0]).toEqual('mouseup');
            expect(bind.argsForCall[1][1]).toBe(window);
            expect(bind.argsForCall[1][2]).toBeAFunction();

            expect(preventDefault).toHaveBeenCalled();

        });

        function scrollBy(mouseDownClient, scrollAmount, screenOffset, previousScroll, scrollBarOffset, isHorz) {
            var move = mockEvent('mousemove', true);
            var scrollClient = mouseDownClient + scrollAmount;

            move.clientY = scrollClient;
            move.clientX = scrollClient;
            move.screenY = scrollClient + screenOffset;
            move.screenX = scrollClient + screenOffset;
            //expect(model.top).toBe(previousScroll / viewHeight * grid.virtualPixelCellModel.totalHeight());
            document.body.dispatchEvent(move);

            var actualScroll = isHorz ? model.left : model.top;
            var view = isHorz ? viewWidth : viewHeight;
            var total = isHorz ? grid.virtualPixelCellModel.totalWidth() : grid.virtualPixelCellModel.totalHeight();
            expect(actualScroll).toBe((scrollClient - scrollBarOffset) / view * total);
        }


        function sendScrollToBar(bar, scrolls, scrollBarPosition, isHorz) {
            var down = mockEvent('mousedown');
            var scrollBarOffset = Math.floor(isHorz ? getScrollBarWidth() : getScrollBarHeight() / 2);
            var mouseDownClient = scrollBarPosition + scrollBarOffset;
            var screenYOffset = 11;
            down.clientY = mouseDownClient;
            down.clientX = mouseDownClient;
            down.layerY = scrollBarOffset;
            down.layerX = scrollBarOffset;
            var mouseDownScreen = mouseDownClient + screenYOffset;
            down.screenY = mouseDownScreen;
            down.screenX = mouseDownScreen;
            //x shouldn't matter

            bar.dispatchEvent(down);

            scrolls.forEach(function (scroll, i) {
                var newScroll = scrollBarPosition + scroll;
                scrollBy(mouseDownClient, newScroll, screenYOffset, scrolls[i - 1] || scrollBarPosition, scrollBarOffset, isHorz);
                scrollBarPosition += scroll;
            });

            fireMouseUp(bar);
            return scrollBarPosition;
        }

        it('should scroll with mousemove', function () {
            var vertBar = model.vertScrollBar.render();
            //send two scrolls to ensure it doesn't reset in between (cause that was a bug)
            var top = sendScrollToBar(vertBar, [4, 6, 3, 2, -1], 0);
            sendScrollToBar(vertBar, [2, 5, 6], top);

            var horzBar = model.horzScrollBar.render();
            //send two scrolls to ensure it doesn't reset in between (cause that was a bug)
            var left = sendScrollToBar(horzBar, [2, 8, -1, 3, 2], 0, true);
            sendScrollToBar(horzBar, [5, 2, 9], left, true);
        });

        function fireMouseUp(bar) {

            var up = mockEvent('mouseup');
            window.dispatchEvent(up);
        }

        it('should unbind on mouseup', function () {
            var bar = model.vertScrollBar.render();
            var unbind = jasmine.createSpy();
            var bind = grid.eventLoop.bind;
            grid.eventLoop.bind = function () {
                bind.apply(bind, arguments);
                return unbind;
            };
            var mousedown = mockEvent('mousedown');
            bar.dispatchEvent(mousedown);
            fireMouseUp(bar);
            expect(unbind).toHaveBeenCalled();
            expect(unbind.callCount).toBe(2);
        });
    });


});