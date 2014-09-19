/*
 A simple package for creating a list of listeners that can be added to and notified
 */

module.exports = function () {
    var listeners = [];
    return {
        //returns a removal function to unbind the listener
        addListener: function (fn) {
            var index = listeners.length;
            listeners.push(fn);
            return function () {
                //since we are the only ones modifying this array keeping the index is a nice perf win
                listeners.splice(index);
            };
        },
        notify: function (e) {
            listeners.forEach(function (listener) {
                listener(e);
            });
        }
    };
};