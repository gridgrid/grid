describe('event-loop', function () {
    var core = require('@grid/grid-spec-helper')();
    var mockEvent = require('@grid/custom-event');
    var loop;
    var grid;
    beforeEach(inject(function () {
        grid = core.buildSimpleGrid();
        loop = grid.eventLoop;
    }));

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
        //using mousewheel to get some other handler, we know will be there
        loop.fire({type: 'testevent'});
        expect(interceptorCalledFirst).toBe(true);

    });

    it('should have state of whether its in the loop', function () {
        expect(loop.isRunning).toEqual(false);
    });

    it('should say its in the loop if it is', function () {
        loop.addInterceptor(inLoopFn);
        loop.fire({});
        function inLoopFn() {
            expect(loop.isRunning).toEqual(true);
        }
    });

    it('should allow loop exit listener to be added and removed', function () {
        var unbind = loop.addExitListener(jasmine.createSpy());
        unbind();
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

            spy.reset();
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

            spy.reset();
            unbind();
            div.dispatchEvent(click);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should let me bind, fire and unbind a dom event to the grid container and be in loop during', function () {
            var spy = jasmine.createSpy();
            var container = core.container;
            grid.eventLoop.setContainer(container);
            var div = document.createElement('div');
            container.appendChild(div);

            grid.eventLoop.bind('click', setWasInLoop);
            var unbind = grid.eventLoop.bind('click', spy);
            var click = mockEvent('click', true);
            div.dispatchEvent(click);
            expect(spy).toHaveBeenCalled();
            expect(wasInLoop).toEqual(true);

            spy.reset();
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

    });

});