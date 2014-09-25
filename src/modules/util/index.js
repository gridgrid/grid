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
    }
};