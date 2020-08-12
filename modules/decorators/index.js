"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_clean_1 = require("../dirty-clean");
var position_range_1 = require("../position-range");
var util = require("../util");
function create(grid) {
    var dirtyClean = dirty_clean_1.default(grid);
    var aliveDecorators = [];
    var deadDecorators = [];
    var decoratorsInstance = {
        add: function (_decorators) {
            var decorators = util.toArray(_decorators);
            decorators.forEach(function (decorator) {
                aliveDecorators.push(decorator);
                if (decorator._decoratorDirtyClean) {
                    decorator._decoratorDirtyClean.enable();
                }
            });
            dirtyClean.setDirty();
        },
        remove: function (_decorators) {
            var decorators = util.toArray(_decorators);
            decorators.forEach(function (decorator) {
                var index = aliveDecorators.indexOf(decorator);
                if (index !== -1) {
                    aliveDecorators.splice(index, 1);
                    deadDecorators.push(decorator);
                    if (decorator._decoratorDirtyClean) {
                        decorator._decoratorDirtyClean.disable();
                    }
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
            var thisDirtyClean = dirty_clean_1.default(grid);
            var decoratorBase = {
                _decoratorDirtyClean: thisDirtyClean,
                render: function () {
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
                }
            };
            var decorator = position_range_1.default(decoratorBase, thisDirtyClean, dirtyClean);
            decorator.top = t;
            decorator.left = l;
            decorator.height = h;
            decorator.width = w;
            decorator.units = u || decorator.units;
            decorator.space = s || decorator.space;
            return decorator;
        }
    };
    return decoratorsInstance;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map