module.exports = function (target, src) {
    for (var key in src) {
        try {
            target[key] = src[key];
        } catch (e) {
            //nothing if it unwritable fine.
        }
    }
    
    return target;
};