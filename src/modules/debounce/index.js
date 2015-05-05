module.exports = function(fn, delay) {
    var f = function debounced() {
        if (f.timeout) {
            clearTimeout(f.timeout);
            f.timeout = undefined;
        }
        if (!f.canceled) {
            f.timeout = setTimeout(fn, delay);
        }
        f.cancel = function() {
            clearTimeout(f.timeout);
            f.timeout = undefined;
            f.canceled = true;
        };
    };
    return f;
};