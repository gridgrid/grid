module.exports = {
    clamp: function (num, min, max, returnNaN) {
        if (num > max) {
            return returnNaN ? NaN : max;
        }
        if (num < min) {
            return returnNaN ? NaN : min;
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
    },
    position: function (elem, t, l, b, r) {
        elem.style.top = t + 'px';
        elem.style.left = l + 'px';
        elem.style.bottom = b + 'px';
        elem.style.right = r + 'px';
        elem.style.position = 'absolute';

    }
};