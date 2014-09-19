var mousewheel = require('@grid/mousewheel');

module.exports = function (_grid) {
    var grid = _grid;
    var eloop = {
        isRunning: false
    };
    eloop.bind = function (container) {
        var unbindMouseWheelFn = mousewheel.bind(container, loop);
    };

    var listeners = require('@grid/listeners');
    var interceptors = listeners();
    var exitListeners = listeners();

    eloop.addInterceptor = interceptors.addListener;
    eloop.addExitListener = exitListeners.addListener;

    function loop(e) {
        eloop.isRunning = true;

        interceptors.notify(e);

        switch (e && e.type) {
            case 'mousewheel':
                grid.pixelScrollModel.handleMouseWheel(e);
                break;
            //purely here for unit testing the loop
            case 'testevent':
                eloop.testInterface.handleTestEvent(e);
                break;
        }

        eloop.isRunning = false;
        exitListeners.notify(e);
    }

    //do not call these methods outside of tests or severe things will happen
    eloop.testInterface = {
        loop: loop,
        handleTestEvent: function () {

        }
    };

    return eloop;
};