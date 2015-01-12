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
        var copyData = [];
        var selectionRange = getCopyPasteRange();
        rangeUtil.iterate(selectionRange, function () {
            var row = [];
            copyData.push(row)
            return row;
        }, function (r, c, row) {
            var data = grid.dataModel.getCopyData(r, c);
            row.push(data);
        });
        if (e.clipboardData && e.clipboardData.setData) {
            e.preventDefault();
            e.clipboardData.setData('Text', tsv.stringify(copyData));
        } else {
            console.warn('copy event without clipboard data or setdata property');
        }

    });

    grid.eventLoop.bind('paste', function (e) {
        var selectionRange = getCopyPasteRange();
        if (!e.clipboardData || !e.clipboardData.getData) {
            console.warn('no clipboard data on paste event');
            return;
        }
        var pasteData = tsv.parse(e.clipboardData.getData('Text'));
        var dataChanges = [];
        rangeUtil.iterate(selectionRange, function (r, c) {
            var offsetR = r - selectionRange.top;
            var offsetC = c - selectionRange.left;
            dataChanges.push({row: r, col: c, data: pasteData[offsetR][offsetC], paste: true});
        });
        grid.dataModel.set(dataChanges);
    });

    var maybeSelectText = debounce(function maybeSelectTextInner() {
        if (!model.isSelectionDisabled || !model.isSelectionDisabled()) {
            grid.textarea.value = ' ';
            grid.textarea.select();
        }
    }, 1)

    grid.eventLoop.bind('keyup', maybeSelectText);
    grid.eventLoop.bind('grid-focus', maybeSelectText);

    var model = {};
    return model;
};