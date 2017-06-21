//maybe we should separate the module and the test but it's fine for now cause any requires will still only cause it to execute once
describe('abstract-row-col-model', function () {
    var abstractRowCol = require('@grid/abstract-row-col-model').default;
    require('./test-body')(abstractRowCol, 'colish', 'widthy', 100);
});