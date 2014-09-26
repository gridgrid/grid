module.exports = function (name, bubbles, cancelable, detail) {
    var event = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
};