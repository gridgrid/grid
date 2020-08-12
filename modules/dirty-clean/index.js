"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function create(grid) {
    var dirty = true;
    var unbindDrawHandler = null;
    function listenForDraw() {
        if (!unbindDrawHandler) {
            unbindDrawHandler = grid.eventLoop.bind('grid-draw', function () {
                dirtyCleanInstance.setClean();
            });
        }
    }
    var dirtyCleanInstance = {
        isDirty: function () {
            return dirty;
        },
        isClean: function () {
            return !dirty;
        },
        setDirty: function () {
            dirty = true;
            if (grid.requestDraw) {
                grid.requestDraw();
            }
        },
        setClean: function () {
            dirty = false;
        },
        disable: function () {
            if (unbindDrawHandler) {
                unbindDrawHandler();
                unbindDrawHandler = null;
            }
        },
        enable: function () {
            listenForDraw();
        }
    };
    dirtyCleanInstance.enable();
    return dirtyCleanInstance;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map