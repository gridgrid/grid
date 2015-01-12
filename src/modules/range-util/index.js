module.exports = {
    //takes a point and a length as the ranges in array form
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
    //takes a point and a length as the ranges in array form
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
    },

    //takes two row, col points and creates a normal position range
    createFromPoints: function (r1, c1, r2, c2) {
        var range = {};
        if (r1 < r2) {
            range.top = r1;
            range.height = r2 - r1 + 1;
        } else {
            range.top = r2;
            range.height = r1 - r2 + 1;
        }

        if (c1 < c2) {
            range.left = c1;
            range.width = c2 - c1 + 1;
        } else {
            range.left = c2;
            range.width = c1 - c2 + 1;
        }
        return range;
    },
    iterate: function (range) {
        var cellFn;
        var rowFn;
        if (arguments.length === 2) {
            cellFn = arguments[1];
        } else if (arguments.length === 3) {
            cellFn = arguments[2];
            rowFn = arguments[1];
        }
        for (var r = range.top; r < range.top + range.height; r++) {
            var rowResult;
            if (rowFn) {
                rowResult = rowFn(r);
            }
            for (var c = range.left; c < range.left + range.width; c++) {
                if (cellFn) {
                    cellFn(r, c, rowResult);
                }
            }
        }
    }
};

