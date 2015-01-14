describe('tsv', function () {


    beforeEach(function () {
        this.tsv = require('./index.js');
    });

    function cases() {

        it('should handle basic 2d array', function () {
            this.data = [['v1', 'v2'], ['v3', 'v4']];
            this.string = 'v1\tv2\nv3\tv4'
        });

        function expectsForSpecialChar(charname, char) {
            it('should handle ' + charname + ' in the string', function () {
                this.data = [['v1' + char + 'v1', 'v2'], ['v3', 'v4']];
                this.string = '"v1' + char + 'v1"\tv2\nv3\tv4'
            });


            it('should handle ' + charname + ' at the beginning or end of string', function () {
                this.data = [[char + 'v1', 'v2' + char], ['v3', 'v4']];
                this.string = '"' + char + 'v1"\t"v2' + char + '"\nv3\tv4'
            });

            it('should handle quotes in a string with ' + charname, function () {
                this.data = [['v"1' + char + 'v1', 'v2'], ['v3', 'v4']];
                this.string = '"v""1' + char + 'v1"\tv2\nv3\tv4'
            });

            it('should handle a string with quotes but no other special chars', function () {
                this.data = [['v"1v1"', 'v2'], ['v3', 'v4']];
                this.string = '"v""1v1"""\tv2\nv3\tv4'
            });
        }

        expectsForSpecialChar('tabs', '\t');
        expectsForSpecialChar('newlines', '\n');
    }

    describe('stringify', function () {
        cases();

        afterEach(function () {
            expect(this.tsv.stringify(this.data)).toEqual(this.string);
        });
    });

    describe('parse', function () {
        cases();

        afterEach(function () {
            expect(this.tsv.parse(this.string)).toEqual(this.data);
        });
    });


});