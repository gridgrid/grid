/*
 A simple package for creating a list of listeners that can be added to and notified
 */

module.exports = function () {
    var listeners = [];
    return {
        //returns a removal function to unbind the listener
        addListener: function (fn) {
            listeners.push(fn);
            return function () {
                listeners.splice(listeners.indexOf(fn), 1);
            };
        },
        notify: function (e) {
            listeners.forEach(function (listener) {
                listener(e);
            });
        }
    };
};