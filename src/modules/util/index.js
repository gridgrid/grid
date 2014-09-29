module.exports = {
    clamp: function (num, min, max) {
        if (num > max) {
            return max;
        }
        if (num < min) {
            return min;
        }
        return num;
    },
    isNumber: function (number) {
        return typeof number === 'number' && !isNaN(number);
    },
    isElement: function (node) {
        return !!(node &&
        (node.nodeName || // we are a direct element
        (node.prop && node.attr && node.find)));  // we have an on and find method part of jQuery API
    },
    isArray: function (value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    }
};