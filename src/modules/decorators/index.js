var util = require('../util');
var makeDirtyClean = require('../dirty-clean');
var positionRange = require('../position-range');

module.exports = function (_grid) {
    var grid = _grid;

    var dirtyClean = makeDirtyClean(grid);

    var aliveDecorators = [];
    var deadDecorators = [];

    var decorators = {
        add: function (decorators) {
            if (!util.isArray(decorators)) {
                decorators = [decorators];
            }
            decorators.forEach(function (decorator) {
                aliveDecorators.push(decorator);
            });
            dirtyClean.setDirty();
        },
        remove: function (decorators) {
            if (!util.isArray(decorators)) {
                decorators = [decorators];
            }
            decorators.forEach(function (decorator) {
                var index = aliveDecorators.indexOf(decorator);
                if (index !== -1) {
                    aliveDecorators.splice(index, 1);
                    deadDecorators.push(decorator);
                    dirtyClean.setDirty();
                }
            });
        },
        getAlive: function () {
            return aliveDecorators.slice(0);
        },
        popAllDead: function () {
            var oldDead = deadDecorators;
            deadDecorators = [];
            return oldDead;
        },
        isDirty: dirtyClean.isDirty,
        create: function (t, l, h, w, u, s) {
            var decorator = {};
            var thisDirtyClean = makeDirtyClean(grid);

            //mixin the position range functionality
            positionRange(decorator, thisDirtyClean, dirtyClean);
            decorator.top = t;
            decorator.left = l;
            decorator.height = h;
            decorator.width = w;
            decorator.units = u || decorator.units;
            decorator.space = s || decorator.space;

            //they can override but we should have an empty default to prevent npes
            decorator.render = function () {
                var div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.top = '0px';
                div.style.left = '0px';
                div.style.bottom = '0px';
                div.style.right = '0px';
                if (decorator.postRender) {
                    decorator.postRender(div);
                }
                return div;
            };
            return decorator;

        }

    };


    return decorators;
};