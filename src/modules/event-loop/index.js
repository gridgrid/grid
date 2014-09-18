var mousewheel = require('@grid/mousewheel');

module.exports = function (_grid) {
    var grid = _grid;
    var api = {};
    api.bind = function (container) {
        var unbindMouseWheelFn = mousewheel.bind(container, loop);
    };

    function loop(e) {
        switch(e.type){
            case 'mousewheel':
                
                break;
        }
    }

    return api;
};