var ctrlOrCmd = require('../ctrl-or-cmd');
var tsv = require('../tsv');
var debounce = require('../debounce');

module.exports = function (_grid) {
    var grid = _grid;
    grid.eventLoop.bind('keydown', function (e) {
        if (ctrlOrCmd(e)) {
            if (key.is(key.code.alnum.c, e.which)) {
                //prepare for copy
                var copyData = [];
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
                for (var r = selectionRange.top; r < selectionRange.top + selectionRange.height; r++) {
                    var row = [];
                    copyData.push(row)
                    for (var c = selectionRange.left; c < selectionRange.left + selectionRange.width; c++) {
                        var data = grid.dataModel.getCopyData(r, c);
                        row.push(data);
                    }
                }
                grid.textarea.value = tsv.stringify(copyData);
            } else if (key.is(key.code.alnum.v, e.which)) {
                //prepare for paste
                grid.textarea.value = '';
            }
        }
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