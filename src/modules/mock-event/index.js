module.exports = function (name, bubbles, cancelable, detail) {
    var event = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    event.initCustomEvent('mousewheel', bubbles, cancelable, detail);
    return event;
};