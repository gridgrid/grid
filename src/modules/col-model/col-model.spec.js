var abstractRowColTest = require('../abstract-row-col-model/test-body.js');
var colModelFn = require('../col-model').create;

describe('col-model', function () {
    describe('abstract interface', function () {
        abstractRowColTest(colModelFn, 'col', 'width', 100);
    });

});