describe('debounce', function () {
    var debounce = require('@grid/debounce');

    it('should not call immediately', function () {
        var spy = jasmine.createSpy();
        debounce(spy, 1)();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should call after the delay', function () {
        var spy = jasmine.createSpy();
        debounce(spy, 1)();
        waits(2);
        runs(function () {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('should not call if called again before delay', function () {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 50000);
        debounced();
        waits(1);
        runs(function () {
            debounced();
        });
        waits(1);
        runs(function () {
            expect(spy).not.toHaveBeenCalled();
            clearTimeout(debounce.timeout);
        });
    });

    it('should only call once per time period', function () {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 1);
        debounced();
        debounced();
        waits(2);
        runs(function () {
            expect(spy.callCount).toBe(1);
        });
    });

    it('should be possible to cancel it', function () {
        var spy = jasmine.createSpy();
        var debounced = debounce(spy, 1);
        debounced();
        clearTimeout(debounced.timeout);
        waits(2);
        runs(function () {
            expect(spy).not.toHaveBeenCalled();
        });
    });

});