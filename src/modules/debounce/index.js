module.exports = function (fn, delay) {
    var f = function debounced() {
        if (f.timeout) {
            clearTimeout(f.timeout);
            f.timeout = undefined;
        }
        f.timeout = setTimeout(fn, delay);
    };
    return f;
};