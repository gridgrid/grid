"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function clamp(num, min, max, returnNaN) {
    if (num > max) {
        return returnNaN ? NaN : max;
    }
    if (num < min) {
        return returnNaN ? NaN : min;
    }
    return num;
}
exports.clamp = clamp;
function isRow(rowCol) {
    return rowCol === 'row';
}
exports.isRow = isRow;
function isCol(rowCol) {
    return rowCol === 'col';
}
exports.isCol = isCol;
function isNumber(num) {
    return typeof num === 'number' && !isNaN(num);
}
exports.isNumber = isNumber;
function isElementWithStyle(node) {
    return !!node.style;
}
exports.isElementWithStyle = isElementWithStyle;
function isElement(node) {
    return !!(node &&
        node.nodeName);
}
exports.isElement = isElement;
function toArray(thing) {
    return thing != undefined && (!Array.isArray(thing) ? [thing] : thing) || [];
}
exports.toArray = toArray;
function position(elem, t, l, b, r, h, w) {
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
}
exports.position = position;
function position3D(elem, t, l) {
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
exports.position3D = position3D;
//# sourceMappingURL=index.js.map