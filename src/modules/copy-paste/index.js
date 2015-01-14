var ctrlOrCmd = require('../ctrl-or-cmd');
var tsv = require('../tsv');
var debounce = require('../debounce');
var rangeUtil = require('../range-util');


module.exports = function (_grid) {
    var grid = _grid;

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
        //prepare for copy
        var copyTable = document.createElement('table');
        var selectionRange = getCopyPasteRange();
        rangeUtil.iterate(selectionRange, function () {
            var row = document.createElement('tr');
            copyTable.appendChild(row);
            return row;
        }, function (r, c, row) {
            var data = grid.dataModel.getCopyData(r, c);
            var td = document.createElement('td');
            td.innerHTML = data;
            row.appendChild(td);
        });
        grid.textarea.innerHTML = copyTable.outerHTML;
        grid.textarea.select();
    });

    grid.eventLoop.bind('paste', function (e) {
        console.log('paste', e);
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
            rangeUtil.iterate(selectionRange, function (r, c) {
                var offsetR = r - selectionRange.top;
                var offsetC = c - selectionRange.left;
                dataChanges.push({row: r, col: c, data: pasteData[offsetR][offsetC], paste: true});
            });
            grid.dataModel.set(dataChanges);
        }, 1);
    });

    var maybeSelectText = debounce(function maybeSelectTextInner() {
        if (!model.isSelectionDisabled || !model.isSelectionDisabled()) {
            grid.textarea.innerText = 'gridtext';
            grid.textarea.select();
        }
    }, 1)

    grid.eventLoop.bind('keyup', function (e) {
        console.log('keyup', e);
        maybeSelectText();
    });
    grid.eventLoop.bind('grid-focus', maybeSelectText);

    var model = {};
    return model;
};