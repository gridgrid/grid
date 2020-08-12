"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debounce_1 = require("../debounce");
var tsv = require("../tsv");
var innerText = require('inner-text-shim');
function create(grid) {
    function getCopyPasteRange() {
        var selectionRange = grid.navigationModel.selection;
        if (selectionRange.top === -1) {
            selectionRange = {
                top: grid.navigationModel.focus.row,
                left: grid.navigationModel.focus.col,
                width: 1,
                height: 1
            };
        }
        return selectionRange;
    }
    grid.eventLoop.bind('copy', function (e) {
        var _a, _b;
        if (!grid.focused) {
            if (e.target === grid.textarea) {
                e.preventDefault();
            }
            return;
        }
        var copyTable = document.createElement('table');
        var tableBody = document.createElement('tbody');
        copyTable.appendChild(tableBody);
        var tsvData = [];
        var selectionRange = getCopyPasteRange();
        var gotNull = false;
        grid.data.iterate(selectionRange, function () {
            var row = document.createElement('tr');
            tableBody.appendChild(row);
            var array = [];
            tsvData.push(array);
            return {
                row: row,
                array: array
            };
        }, function (r, c, rowResult) {
            var data = grid.dataModel.get(r, c, true);
            if (data == null) {
                return gotNull = true;
            }
            var td = document.createElement('td');
            if (data.value) {
                td.setAttribute('grid-data', JSON.stringify(data.value));
            }
            td.textContent = data.formatted || ' ';
            td.innerHTML = td.innerHTML.replace(/\n/g, '<br>') || ' ';
            rowResult.row.appendChild(td);
            rowResult.array.push(data.formatted);
            return undefined;
        });
        if (!gotNull) {
            (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.setData('text/plain', tsv.stringify(tsvData));
            (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData('text/html', copyTable.outerHTML);
            e.preventDefault();
            setTimeout(function () {
                grid.eventLoop.fire('grid-copy');
            }, 1);
        }
    });
    function makePasteDataChange(r, c, data) {
        var value;
        var formatted;
        if (typeof data === 'string') {
            formatted = data;
        }
        else {
            value = data.value;
            formatted = data.formatted;
        }
        return {
            row: r,
            col: c,
            value: value,
            formatted: formatted,
            paste: true
        };
    }
    grid.eventLoop.bind('paste', function (e) {
        if (!grid.focused) {
            return;
        }
        var selectionRange = getCopyPasteRange();
        if (!e.clipboardData || !e.clipboardData.getData) {
            console.warn('no clipboard data on paste event');
            return;
        }
        var tsvPasteData = tsv.parse(e.clipboardData.getData('text/plain'));
        var pasteHtml = e.clipboardData.getData('text/html');
        e.preventDefault();
        setTimeout(function () {
            var tempDiv = document.createElement('div');
            if (pasteHtml.match(/<meta name=ProgId content=Excel.Sheet>/)) {
                pasteHtml = pasteHtml.replace(/[\n\r]+  /g, ' ').replace(/[\n\r]+/g, '');
            }
            tempDiv.innerHTML = pasteHtml;
            var table = tempDiv.querySelector('table');
            var pasteData = tsvPasteData;
            if (table) {
                var tablePasteData_1;
                table.style.whiteSpace = 'pre';
                tablePasteData_1 = [];
                var trs_1 = tempDiv.querySelectorAll('tr');
                [].forEach.call(trs_1, function (tr) {
                    var row = [];
                    tablePasteData_1.push(row);
                    var tds = tr.querySelectorAll('td');
                    [].forEach.call(tds, function (td) {
                        var text = innerText(td);
                        var dataResult = {
                            formatted: text && text.trim(),
                            value: undefined
                        };
                        var gridData = td.getAttribute('grid-data');
                        if (gridData) {
                            try {
                                dataResult.value = JSON.parse(gridData);
                            }
                            catch (error) {
                                console.warn('somehow couldn\'t parse grid data');
                            }
                        }
                        row.push(dataResult);
                    });
                });
                pasteData = tablePasteData_1;
            }
            var dataChanges = [];
            var singlePasteValue;
            if (pasteData.length === 1 && pasteData[0].length === 1) {
                singlePasteValue = pasteData[0][0];
            }
            if (singlePasteValue) {
                var singlePasteString_1 = singlePasteValue;
                var ranges = [selectionRange];
                ranges = ranges.concat(grid.navigationModel.otherSelections);
                ranges.forEach(function (range) {
                    grid.data.iterate(range, function (r, c) {
                        dataChanges.push(makePasteDataChange(r, c, singlePasteString_1));
                    });
                });
            }
            else {
                var top_1 = selectionRange.top;
                var left_1 = selectionRange.left;
                pasteData.forEach(function (row, r) {
                    var dataRow = r + top_1;
                    if (dataRow > grid.data.row.count() - 1) {
                        return;
                    }
                    row.forEach(function (pasteValue, c) {
                        var dataCol = c + left_1;
                        if (pasteValue == undefined || dataCol > grid.data.col.count() - 1) {
                            return;
                        }
                        dataChanges.push(makePasteDataChange(dataRow, dataCol, pasteValue));
                    });
                });
                var newSelection = {
                    top: top_1,
                    left: left_1,
                    height: pasteData.length,
                    width: pasteData[0].length
                };
                grid.navigationModel.clearSelection();
                grid.navigationModel.setSelection(newSelection);
            }
            grid.dataModel.set(dataChanges);
        }, 1);
    });
    var maybeSelectText = debounce_1.default(function maybeSelectTextInner() {
        if (!(grid.editModel && grid.editModel.editing) && grid.focused) {
            grid.textarea.value = grid.dataModel.get(grid.navigationModel.focus.row, grid.navigationModel.focus.col).formatted || '.';
            grid.textarea.select();
        }
    }, 1);
    grid.eventLoop.bind('keyup', function (_e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('grid-focus', function (_e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('mousedown', function (e) {
        if (e.target !== grid.textarea) {
            return;
        }
        maybeSelectText();
    });
    return {
        _maybeSelectText: maybeSelectText
    };
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map