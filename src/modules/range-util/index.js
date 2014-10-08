module.exports = {
    intersect: function (range1, range2) {
        var range2Start = range2[0];
        var range1Start = range1[0];
        var range1End = range1Start + range1[1] - 1;
        var range2End = range2Start + range2[1] - 1;
        if (range2Start > range1End || range2End < range1Start) {
            return null;
        }
        var resultStart = (range1Start > range2Start ? range1Start : range2Start);
        var resultEnd = (range1End < range2End ? range1End : range2End);
        return [
            resultStart,
            resultEnd - resultStart + 1
        ];
    },
    union: function (range1, range2) {
        if (!range1) {
            return range2;
        }
        if (!range2) {
            return range1;
        }
        var range2Start = range2[0];
        var range2End = range2Start + range2[1] - 1;
        var range1Start = range1[0];
        var range1End = range1Start + range1[1] - 1;
        var resultStart = (range1Start < range2Start ? range1Start : range2Start);
        return [
            resultStart,
            (range1End > range2End ? range1End : range2End) - resultStart + 1
        ];
    }
};

