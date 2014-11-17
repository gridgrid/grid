describe('debounce', function () {
    var debounce = require('../debounce');

    it('should not call immediately', function () {
        var spy = jasmine.createSpy();
        debounce(spy, 1)();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should call after the delay', function (done) {
        var spy = jasmine.createSpy();
        debounce(spy, 1)();
        setTimeout(function () {
            expect(spy).toHaveBeenCalled();
            done();
        }, 2);
    });

    it('should not call if called again before delay', function (done) {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 50000);
        debounced();
        setTimeout(function () {
            debounced();
            setTimeout(function () {
                expect(spy).not.toHaveBeenCalled();
                clearTimeout(debounce.timeout);
                done();
            }, 1);
        }, 1);
    });

    it('should only call once per time period', function (done) {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 1);
        debounced();
        debounced();
        setTimeout(function () {
            expect(spy.calls.count()).toBe(1);
            done();
        }, 2);
    });

    it('should be possible to cancel it', function (done) {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 1);
        debounced();
        clearTimeout(debounced.timeout);
        setTimeout(function () {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 2);
    });

});