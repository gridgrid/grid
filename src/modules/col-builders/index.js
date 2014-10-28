var noop = require('@grid/no-op');

module.exports = function (_grid) {
    var grid = _grid;
    var dirtyClean = require('@grid/dirty-clean')(grid);
    var builders = {};
    var api = {
        isDirty: dirtyClean.isDirty,
        create: function (render, update) {
            return {render: render || noop, update: update || noop};
        },
        set: function (c, builder) {
            builders[c] = builder;
            dirtyClean.setDirty();
            return builder;
        },
        get: function (c) {
            return builders[c];
        }
    };
    return api;
};