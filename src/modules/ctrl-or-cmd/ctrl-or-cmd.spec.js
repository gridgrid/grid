describe('ctrl-or-cmd', function () {
    beforeEach(function () {
        this.ctrlOrCmd = require('./index.js');
    });

    it('should return true if ctrl key is pressed and windows', function () {
        var nav = window.navigator;
        window.navigator = {
            userAgent: 'windows'
        };
        expect(this.ctrlOrCmd({ctrlKey: true})).toBe(true);
        //put it back here
        window.navigator = nav;
    });

    it('should return false if not ctrl key is pressed and windows', function () {
        var nav = window.navigator;
        window.navigator = {
            userAgent: 'windows'
        };
        expect(this.ctrlOrCmd({ctrlKey: false})).toBe(false);
        //put it back here
        window.navigator = nav;
    });

    it('should return true if meta key is pressed and not windows', function () {
        expect(this.ctrlOrCmd({metaKey: true})).toBe(true);
    });

    it('should return false if not meta key and not windows', function () {
        expect(this.ctrlOrCmd({metaKey: false})).toBe(false);
    });

});