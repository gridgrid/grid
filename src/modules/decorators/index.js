var util = require('@grid/util');


module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);

    var aliveDecorators = [];
    var deadDecorators = [];

    var api = {
        add: function (decorator) {
            aliveDecorators.push(decorator);
            dirtyClean.setDirty();
        },
        remove: function (decorators) {
            if (!util.isArray(decorators)) {
                decorators = [decorators];
            }
            decorators.forEach(function (decorator) {
                aliveDecorators.splice(aliveDecorators.indexOf(decorator), 1);
                deadDecorators.push(decorator);
                dirtyClean.setDirty();
            });

        },
        getAlive: function () {
            return aliveDecorators;
        },
        popAllDead: function () {
            return deadDecorators;
        },
        isDirty: dirtyClean.isDirty

    };


    return api;
};