describe('mousewheel', function () {
    var mousewheel;
    var $ = require('jquery');
    var mockEvent = require('../custom-event');
    var div;

    var events = ['mousewheel', 'wheel', 'DOMMouseScroll'];


    beforeEach(function () {
        mousewheel = require('../mousewheel');
        div = document.createElement('div');
    });

    it('should bind all types of wheel events', function () {

        var div = document.createElement('div');
        var add = spyOn(div, 'addEventListener');
        var listener = function () {
        };
        mousewheel.bind(div, listener);

        expect(add).toHaveBeenCalledWithAll(events);
        //make sure the second argument was at least a function for all the calls (since it's not really the function we passed in)
        events.forEach(function (e, i) {
            expect(add.calls.argsFor(i)[1]).toBeAFunction();
        });
    });


    it('should let me unbind the wheel events', function () {

        var remove = spyOn(div, 'removeEventListener');
        var listener = function () {
        };
        var unbind = mousewheel.bind(div, listener);
        unbind();

        expect(remove).toHaveBeenCalledWithAll(events);
        //make sure the second argument was at least a function for all the calls (since it's not really the function we passed in)
        events.forEach(function (e, i) {
            expect(remove.calls.argsFor(i)[1]).toBeAFunction();
        });
    });

    function expectListenerToHaveBeenCalledWithDelta(listener, y, x) {
        expect(listener).toHaveBeenCalled();
        var calledEvent = listener.calls.argsFor(0)[0];
        expect(calledEvent.type).toBe('mousewheel');
        expect(calledEvent.deltaY).toBe(y);
        expect(calledEvent.deltaX).toBe(x);
    }

    function bindListener() {
        var listener = jasmine.createSpy();
        mousewheel.bind(div, listener);
        return listener;
    }

    describe('normalize event', function () {
        var listener;
        beforeEach(function () {
            listener = bindListener();
        });

        it('should call a bound listener with a normalized mousewheel event', function () {

            var event = mockEvent('mousewheel');
            event.wheelDelta = event.wheelDeltaY = 10;
            event.wheelDeltaX = 20;
            div.dispatchEvent(event);

            expectListenerToHaveBeenCalledWithDelta(listener, 10, 20);
        });

        it('should call a bound listener with a normalized wheel event', function () {

            var event = mockEvent('wheel');
            event.deltaY = -22;
            event.deltaX = -11;
            div.dispatchEvent(event);

            expectListenerToHaveBeenCalledWithDelta(listener, 22, 11);
        });

        it('should call a bound listener with a normalized wheel event for solely Y scroll', function () {

            var event = mockEvent('wheel');
            event.deltaY = -22;
            event.deltaX = 0;
            div.dispatchEvent(event);

            expectListenerToHaveBeenCalledWithDelta(listener, 22, 0);
        });

        it('should call a bound listener with a normalized DOMMouseScroll yaxis event', function () {

            var event = mockEvent('DOMMouseScroll', false, false, 2);
            event.axis = 1;
            div.dispatchEvent(event);

            expectListenerToHaveBeenCalledWithDelta(listener, 0, -24);
        });

        it('should call a bound listener with a normalized DOMMouseScroll yaxis event', function () {

            var event = mockEvent('DOMMouseScroll', false, false, 3);
            event.axis = 2;
            div.dispatchEvent(event);

            expectListenerToHaveBeenCalledWithDelta(listener, -36, 0);
        });
    });


});