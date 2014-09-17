module.exports = {
    getDelta: function (event, xaxis) {
        if (event.wheelDelta) { //for everything but firefox
            var delta = event.wheelDeltaY;
            if (xaxis) {
                delta = event.wheelDeltaX;
            }
            return delta;

        } else if (event.detail) { //for firefox pre version 17
            if (event.axis && ((event.axis === 1 && xaxis) || (event.axis === 2 && !xaxis))) {
                return -1 * event.detail * 12;
            }
        } else if (event.deltaX || event.deltaY) {
            if (xaxis) {
                return -1 * event.deltaX;
            } else {
                return -1 * event.deltaY;
            }
        }
        return 0;
    }

}