export type RowCol = 'row' | 'col';

export function clamp(num: number, min: number, max: number, returnNaN?: boolean) {
    if (num > max) {
        return returnNaN ? NaN : max;
    }
    if (num < min) {
        return returnNaN ? NaN : min;
    }
    return num;
}

export function isRow(rowCol: RowCol) {
    return rowCol === 'row';
}

export function isCol(rowCol: RowCol) {
    return rowCol === 'col';
}

export function isNumber(num: any): num is number {
    return typeof num === 'number' && !isNaN(num);
}

export function isElementWithStyle(node?: any): node is HTMLElement {
    return !!node.style;
}

export function isElement(node?: any): node is HTMLElement {
    return !!(node &&
        node.nodeName); // we are a direct element
}
export function toArray<T>(thing?: T | T[]): T[] {
    return thing != undefined && (!Array.isArray(thing) ? [thing] : thing) || [];
}

export function position(elem: HTMLElement, t?: number, l?: number, b?: number, r?: number, h?: number, w?: number) {
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

export function position3D(elem: HTMLElement, t?: number, l?: number) {
    let x = '0';
    let y = '0';
    if (l != null) {
        x = l + 'px';
    }
    if (t != null) {
        y = t + 'px';
    }
    elem.style.transform = 'translate3d(' + x + ',' + y + ',0)';
}
