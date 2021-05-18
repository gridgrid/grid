var abstractRowColTest = require('../abstract-row-col-model/test-body.js');
var rowModelFn = require('../row-model').create;

describe('row-model', function () {
    describe('abstract interface', function () {
        abstractRowColTest(rowModelFn, 'row', 'height', 30);
    });

});