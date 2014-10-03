var abstractRowColTest = require('@grid/abstract-row-col-model/abstract-row-col-model.spec.js');
var rowModelFn = require('@grid/row-model');

describe('row-model', function () {
    describe('abstract interface', function () {
        abstractRowColTest(rowModelFn, 'row', 'height', 30);
    });

});