var mockEvent = require('../custom-event');
var eventLoopFn = require('../event-loop');

describe('event-loop', function () {
    require('../grid-spec-helper')();
    var loop;
    var grid;
    beforeEach(function () {
        grid = this.buildSimpleGrid();
        loop = grid.eventLoop;
    });

    function spyAndFireAllNormalEvents(not) {
        var events = eventLoopFn.EVENTS;
        //include mousewheel for tests because it's not bound the normal way
        events.push('mousewheel');
        var self = this;
        events.forEach(function (type) {
            var spy = jasmine.createSpy(type);
            //use interceptor in case something else tries to stop propagation
            grid.eventLoop.addInterceptor(spy);
            self.container.dispatchEvent(mockEvent(type, true, true));
            var spyExpect = expect(spy);
            if (not) {
                spyExpect = spyExpect.not;
            }
            spyExpect.toHaveBeenCalled();
        });
    }

    it('should bind a handler for all the events we care about', function () {
        spyAndFireAllNormalEvents.call(this);
    });

    function spyAndFireAllGridEvents(not) {
        eventLoopFn.GRID_EVENTS.forEach(function (type) {
            var spy = jasmine.createSpy(type);
            //use interceptor in case something else tries to stop propagation
            grid.eventLoop.addInterceptor(spy);
            window.dispatchEvent(mockEvent(type, true, true));
            if (not) {
                expect(spy).not.toHaveBeenCalled();
            } else {
                expect(spy).toHaveBeenCalled();

            }
        });
    }

    it('should bind a handler for all the grid events we care about', function () {
        spyAndFireAllGridEvents.call(this);
    });

    it('should unbind all normal events on grid-destroy', function () {
        loop.fire('grid-destroy');
        spyAndFireAllNormalEvents.call(this, true);
    });

    it('should unbind all grid events on grid-destroy', function () {
        loop.fire('grid-destroy');
        spyAndFireAllGridEvents.call(this, true);
    });

    it('should unbind any events bound to dom elements through bind', function () {
        var div = document.createElement('div');
        var spy = jasmine.createSpy('click handler');
        loop.bind('click', div, spy);
        loop.fire('grid-destroy');
        div.dispatchEvent(mockEvent('click'));
        expect(spy).not.toHaveBeenCalled();
    });

    it('should unbind any events bound to the window through bind', function () {
        var spy = jasmine.createSpy('click handler');
        loop.bind('click', window, spy);
        loop.fire('grid-destroy');
        window.dispatchEvent(mockEvent('click'));
        expect(spy).not.toHaveBeenCalled();
    });

    it('should bind event listeners to a container', function () {
        var div = document.createElement('div');
        var add = spyOn(div, 'addEventListener');
        loop.setContainer(div);
        expect(add).toHaveBeenCalled();
    });

    it('should allow loop interceptors to be added and removed', function () {
        var unbind = loop.addInterceptor(jasmine.createSpy());
        unbind();
    });

    it('should call interceptor before any event handling', function () {
        var interceptorCalled = false;
        loop.addInterceptor(function () {
            interceptorCalled = true;
        });

        var interceptorCalledFirst = true;
        loop.bind('test-event', function () {
            interceptorCalledFirst = interceptorCalled;
        });
        loop.fire('testevent');
        expect(interceptorCalledFirst).toBe(true);

    });

    it('should have state of whether its in the loop', function () {
        expect(loop.isRunning).toEqual(false);
    });


    it('should say its in the loop if it is', function () {
        var wasRunning = false;
        loop.addInterceptor(function inLoopFn(e) {
            wasRunning = grid.eventLoop.isRunning;
        });
        loop.fire({});
        expect(wasRunning).toEqual(true);
    });

    it('should allow loop exit listener to be added and removed', function () {
        var unbind = loop.addExitListener(jasmine.createSpy());
        unbind();
        expect(true).toBe(true);
    });

    it('should notify exit listeners after looping with loop event', function () {
        var spy = jasmine.createSpy();
        loop.addExitListener(spy);
        var event = {};
        loop.fire(event);
        expect(spy).toHaveBeenCalledWith(event);
    });

    describe('binding', function () {
        var wasInLoop;
        beforeEach(function () {
            wasInLoop = false;
        });

        function setWasInLoop() {
            wasInLoop = true;
        }

        it('should let me bind, fire and unbind an event and be in loop during', function () {

            var spy = jasmine.createSpy();
            grid.eventLoop.bind('test-event', setWasInLoop);
            var unbind = grid.eventLoop.bind('test-event', spy);
            grid.eventLoop.fire('test-event');
            expect(spy).toHaveBeenCalled();
            expect(wasInLoop).toEqual(true);

            spy.calls.reset();
            unbind();
            grid.eventLoop.fire('test-event');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should let me bind, fire and unbind a function to a specfic dom event on an element and be in loop during', function () {
            var spy = jasmine.createSpy();
            var div = document.createElement('div');
            grid.eventLoop.bind('click', div, setWasInLoop);
            var unbind = grid.eventLoop.bind('click', div, spy);
            var click = mockEvent('click');
            div.dispatchEvent(click);
            expect(spy).toHaveBeenCalled();
            expect(wasInLoop).toEqual(true);

            spy.calls.reset();
            unbind();
            div.dispatchEvent(click);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should set pointer events all on an element to which im binding', function () {
            var div = document.createElement('div');
            grid.eventLoop.bind('click', div, function () {

            });
            expect(div.style.pointerEvents).toBe('auto');
        });

        it('should let me bind, fire and unbind a dom event to the grid container and be in loop during', function () {
            var spy = jasmine.createSpy();
            var container = this.container;
            grid.eventLoop.setContainer(container);
            var div = document.createElement('div');
            container.appendChild(div);

            grid.eventLoop.bind('click', setWasInLoop);
            var unbind = grid.eventLoop.bind('click', spy);
            var click = mockEvent('click', true);
            div.dispatchEvent(click);
            expect(spy).toHaveBeenCalled();
            expect(wasInLoop).toEqual(true);

            spy.calls.reset();
            unbind();
            div.dispatchEvent(click);
            expect(spy).not.toHaveBeenCalled();

        });

        it('should still be running if an event is fired from within an event', function () {
            grid.eventLoop.bind('outer', function () {
                grid.eventLoop.fire('inner');
                expect(grid.eventLoop.isRunning).toBe(true);
            });
            grid.eventLoop.fire('outer');
            expect(grid.eventLoop.isRunning).toBe(false);
        });

        it('should allow unbinding from within a handler', function () {
            var unbind = grid.eventLoop.bind('test-event', function () {
                unbind();
            });
            var spy = jasmine.createSpy('second binding');
            grid.eventLoop.bind('test-event', spy);
            grid.eventLoop.fire('test-event');
            expect(spy).toHaveBeenCalled();
        });

    });

    describe('stop bubbling', function () {
        it('should cause an event not to dispatch to other bound handlers', function () {
            var spy = jasmine.createSpy('post stop bubbling binding');
            grid.eventLoop.bind('test-event', function (e) {
                grid.eventLoop.stopBubbling(e);
            });
            grid.eventLoop.bind('test-event', spy);
            grid.eventLoop.fire('test-event');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should not prevent an event from getting to interceptors', function () {
            var spy = jasmine.createSpy('post stop bubbling interceptor');
            grid.eventLoop.addInterceptor(spy);
            grid.eventLoop.fire(grid.eventLoop.stopBubbling(mockEvent('test-event')));
            expect(spy).toHaveBeenCalled();
        });

        it('should not prevent an event from getting to exit listeners', function () {
            var spy = jasmine.createSpy('post stop bubbling exit listener');
            grid.eventLoop.addExitListener(spy);
            grid.eventLoop.fire(grid.eventLoop.stopBubbling(mockEvent('test-event')));
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('bindOnce', function () {
        it('should fire an event once and then unbind', function () {
            var spy = jasmine.createSpy();
            this.grid.eventLoop.bindOnce('test-event', spy);
            this.grid.eventLoop.fire(mockEvent('test-event'));
            expect(spy).toHaveBeenCalled();
            spy.calls.reset();
            this.grid.eventLoop.fire(mockEvent('test-event'));
            expect(spy).not.toHaveBeenCalled();
        });
    });

});