"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = function (data) {
    var stringResult = '';
    data.forEach(function (row, r) {
        row.forEach(function (value, c) {
            if (value.indexOf('\n') !== -1 || value.indexOf('\t') !== -1 || value.indexOf('"') !== -1) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            stringResult += value;
            if (c !== row.length - 1) {
                stringResult += '\t';
            }
        });
        if (r !== data.length - 1) {
            stringResult += '\n';
        }
    });
    return stringResult;
};
function DSVToArray(strData, strDelimiter) {
    strDelimiter = (strDelimiter || ',');
    var objPattern = new RegExp(('(\\' + strDelimiter + '|\\r?\\n|\\r|^)' +
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        '([^"\\' + strDelimiter + '\\r\\n]+))'), 'gi');
    var arrData = [
        []
    ];
    var arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        var strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter) {
            arrData.push([]);
        }
        var strMatchedValue = void 0;
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
        }
        else {
            strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return (arrData[0].length || !strData) && (arrData) || [
        [strData]
    ];
}
exports.parse = function (stringData) {
    return DSVToArray(stringData, '\t');
};
//# sourceMappingURL=index.js.map