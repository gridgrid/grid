describe('listeners', function () {
    var listeners;
    beforeEach(function () {
        listeners = require('@grid/listeners')();
    });

    it('should allow me to add and remove a listener', function () {
        var spy = jasmine.createSpy();
        var unbind = listeners.addListener(spy);
        unbind();
    });

    it('should allow me to notify the listeners with an optional event', function () {
        var spy = jasmine.createSpy();
        listeners.addListener(spy);
        var event = {};
        listeners.notify(event);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it('should not notify a listener that has unbound itself', function () {
        var spy = jasmine.createSpy();
        var unbind = listeners.addListener(spy);
        unbind();
        var event = {};
        listeners.notify(event);
        expect(spy).not.toHaveBeenCalled();
    });
});