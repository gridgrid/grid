var abstractRowColTest = require('@grid/abstract-row-col-model/abstract-row-col-model.spec.js');
var colModelFn = require('@grid/col-model');

describe('col-model', function () {
    describe('abstract interface', function () {
        abstractRowColTest(colModelFn, 'col', 'width', 100);
    });

});