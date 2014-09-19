describe('event-loop', function () {
    var core = require('@grid/grid-spec-helper')();
    var loop;
    var grid;
    beforeEach(inject(function () {
        grid = core.buildSimpleGrid();
        loop = grid.eventLoop;
    }));

    it('should bind event listeners to a container', function () {
        var div = document.createElement('div');
        var add = spyOn(div, 'addEventListener');
        loop.bind(div);
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
        loop.testInterface.handleTestEvent = function () {
            interceptorCalledFirst = interceptorCalled;
        };
        //using mousewheel to get some other handler, we know will be there
        loop.testInterface.loop({type: 'testevent'});
        expect(interceptorCalledFirst).toBe(true);

    });

    it('should have state of whether its in the loop', function () {
        expect(loop.isRunning).toEqual(false);
    });

    it('should say its in the loop if it is', function () {
        loop.addInterceptor(interceptor);
        loop.testInterface.loop();
        function interceptor() {
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
        loop.testInterface.loop(event);
        expect(spy).toHaveBeenCalledWith(event);
    });

});