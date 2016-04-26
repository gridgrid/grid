var util = {
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
                (node.prop && node.attr && node.find))); // we have an on and find method part of jquery API
    },
    isArray: function (value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    },
    position: function (elem, t, l, b, r, h, w) {
        if (t != null) {
            elem.style.top = t + 'px';
        }
        if (l != null) {
            elem.style.left = l + 'px';
        }
        if (b != null) {
            elem.style.bottom = b + 'px';
        }
        if (r != null) {
            elem.style.right = r + 'px';
        }
        if (h != null) {
            elem.style.height = h + 'px';
        }
        if (w != null) {
            elem.style.width = w + 'px';
        }
        elem.style.position = 'absolute';
    },
    position3D: function (elem, t, l) {
        var x = '0';
        var y = '0';
        if (l != null) {
            x = l + 'px';
        }
        if (t != null) {
            y = t + 'px';
        }
        elem.style.transform = 'translate3d(' + x + ',' + y + ',0)';
    }
};
module.exports = util;
