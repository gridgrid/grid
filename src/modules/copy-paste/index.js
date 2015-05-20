var tsv = require('../tsv');
var debounce = require('../debounce');

module.exports = function(_grid) {
    var grid = _grid;
    var model = {};

    function getCopyPasteRange() {
        var selectionRange = grid.navigationModel.selection;
        //valid selection range cannot go to -1
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

    grid.eventLoop.bind('copy', function(e) {
        if (!grid.focused) {
            if (e.target === grid.textarea) {
                e.preventDefault();
            }
            return;
        }
        // prepare for copy
        var copyTable = document.createElement('table');
        var tableBody = document.createElement('tbody');
        copyTable.appendChild(tableBody);
        var tsvData = [];
        var selectionRange = getCopyPasteRange();
        var gotNull = false;
        grid.data.iterate(selectionRange, function() {
            var row = document.createElement('tr');
            tableBody.appendChild(row);
            var array = [];
            tsvData.push(array);
            return {
                row: row,
                array: array
            };
        }, function(r, c, rowResult) {
            var data = grid.dataModel.getCopyData(r, c);

            // intentional == checks null or undefined
            if (data == null) {
                return gotNull = true; // this breaks the col loop
            }
            var td = document.createElement('td');
            td.innerHTML = data || ' ';
            rowResult.row.appendChild(td);
            rowResult.array.push(td.textContent);
        });
        if (!gotNull) {
            e.clipboardData.setData('text/plain', tsv.stringify(tsvData));
            e.clipboardData.setData('text/html', copyTable.outerHTML);
            e.preventDefault();
            setTimeout(function() {
                grid.eventLoop.fire('grid-copy');
            }, 1);
        }
    });

    grid.eventLoop.bind('paste', function(e) {
        if (!grid.focused) {
            return;
        }
        var selectionRange = getCopyPasteRange();
        if (!e.clipboardData || !e.clipboardData.getData) {
            console.warn('no clipboard data on paste event');
            return;
        }
        var pasteData = tsv.parse(e.clipboardData.getData('text/plain'));
        var pasteHtml = e.clipboardData.getData('text/html');
        e.preventDefault();

        setTimeout(function() {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = pasteHtml;
            if (tempDiv.querySelector('table')) {
                pasteData = [];
                [].forEach.call(tempDiv.querySelectorAll('tr'), function(tr) {
                    var row = [];
                    pasteData.push(row);
                    [].forEach.call(tr.querySelectorAll('td'), function(td) {
                        row.push(td.innerHTML);
                    });
                });
            }
            var dataChanges = [];
            var singlePasteValue;
            if (pasteData.length === 1 && pasteData[0].length === 1) {
                singlePasteValue = pasteData[0][0];
            }
            var ranges = [selectionRange];
            if (singlePasteValue) {
                // this will do nothing if no other selections as it will be an empty array
                ranges = ranges.concat(grid.navigationModel.otherSelections);
            }
            ranges.forEach(function(range) {
                grid.data.iterate(range, function(r, c) {

                    var offsetR = r - range.top;
                    var offsetC = c - range.left;

                    if (!singlePasteValue && (pasteData[offsetR] === undefined || pasteData[offsetR][offsetC] === undefined)) {
                        return;
                    }
                    var pasteValue = singlePasteValue || pasteData[offsetR][offsetC];
                    dataChanges.push({
                        row: r,
                        col: c,
                        data: pasteValue && pasteValue.trim(),
                        paste: true
                    });
                });
            });

            grid.dataModel.set(dataChanges);
        }, 1);
    });

    var maybeSelectText = debounce(function maybeSelectTextInner() {
        if ((!model.isSelectionDisabled || !model.isSelectionDisabled()) && grid.focused) {
            grid.textarea.value = grid.dataModel.get(grid.navigationModel.focus.row, grid.navigationModel.focus.col).formatted || '.';
            grid.textarea.select();
        }
    }, 1)

    model._maybeSelectText = maybeSelectText;

    grid.eventLoop.bind('keyup', function(e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('grid-focus', function(e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('mousedown', function(e) {
        if (e.target !== grid.textarea) {
            return;
        }
        maybeSelectText();
    });
    return model;
};