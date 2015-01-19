var ctrlOrCmd = require('../ctrl-or-cmd');
var tsv = require('../tsv');
var debounce = require('../debounce');
var rangeUtil = require('../range-util');
var sanitize = require('sanitize-html');

module.exports = function (_grid) {
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

    grid.eventLoop.bind('copy', function (e) {
        if (!grid.focused) {
            return;
        }
        //prepare for copy
        var copyTable = document.createElement('table');
        var selectionRange = getCopyPasteRange();
        grid.data.iterate(selectionRange, function () {
            var row = document.createElement('tr');
            copyTable.appendChild(row);
            return row;
        }, function (r, c, row) {
            var data = grid.dataModel.getCopyData(r, c);
            var td = document.createElement('td');
            //sanitize the html pretty hard core for now just to allow spans with data attributes for our rich content use case
            data = sanitize(data, {
                allowedTags: ['span'],
                allowedAttributes: {
                    'span': ['data-*']
                }
            });
            td.innerHTML = data;
            row.appendChild(td);
        });

        grid.textarea.innerHTML = copyTable.outerHTML;
        grid.textarea.select();
    });

    grid.eventLoop.bind('paste', function (e) {
        if (!grid.focused) {
            return;
        }
        var selectionRange = getCopyPasteRange();
        if (!e.clipboardData || !e.clipboardData.getData) {
            console.warn('no clipboard data on paste event');
            return;
        }
        var pasteData = tsv.parse(e.clipboardData.getData('Text'));


        setTimeout(function () {
            if (grid.textarea.querySelector('table')) {
                pasteData = [];
                [].forEach.call(grid.textarea.querySelectorAll('tr'), function (tr) {
                    var row = [];
                    pasteData.push(row);
                    [].forEach.call(tr.querySelectorAll('td'), function (td) {
                        row.push(td.innerHTML);
                    });
                });
            }
            var dataChanges = [];
            grid.data.iterate(selectionRange, function (r, c) {
                var offsetR = r - selectionRange.top;
                var offsetC = c - selectionRange.left;
                dataChanges.push({row: r, col: c, data: pasteData[offsetR][offsetC], paste: true});
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

    grid.eventLoop.bind('keyup', function (e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('grid-focus', function (e) {
        maybeSelectText();
    });
    grid.eventLoop.bind('mousedown', function (e) {
        if (e.target !== grid.textarea) {
            return;
        }
        maybeSelectText();
    });
    return model;
};