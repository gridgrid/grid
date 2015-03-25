var ctrlOrCmd = require('../ctrl-or-cmd');
var tsv = require('../tsv');
var debounce = require('../debounce');
var rangeUtil = require('../range-util');
var sanitize = require('sanitize-html');

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
        var selectionRange = getCopyPasteRange();
        var gotNull = false;
        grid.data.iterate(selectionRange, function() {
            var row = document.createElement('tr');
            copyTable.appendChild(row);
            return row;
        }, function(r, c, row) {
            var data = grid.dataModel.getCopyData(r, c);

            // intentional == checks null or undefined
            if (data == null) {
                return gotNull = true; // this breaks the col loop
            }
            var td = document.createElement('td');
            // sanitize the html pretty hard core for now just to allow spans with data attributes for our rich content use case
            data = sanitize(data, {
                allowedTags: ['span'],
                allowedAttributes: {
                    'span': ['data-*']
                }
            });
            td.innerHTML = data || '&nbsp;';
            row.appendChild(td);
        });
        if (!gotNull) {
            grid.textarea.innerHTML = copyTable.outerHTML;
            grid.textarea.select();
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
        var pasteData = tsv.parse(e.clipboardData.getData('Text'));


        setTimeout(function() {
            if (grid.textarea.querySelector('table')) {
                pasteData = [];
                [].forEach.call(grid.textarea.querySelectorAll('tr'), function(tr) {
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
                //this will do nothing if no other selections as it will be an empty array
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
            grid.textarea.value = 'gridtext';
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