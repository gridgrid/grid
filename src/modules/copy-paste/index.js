var ctrlOrCmd = require('../ctrl-or-cmd');

module.exports = function (_grid) {
    var grid = _grid;
    grid.eventLoop.bind('keydown', function (e) {
        switch (e.type) {
            case 'keydown':
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
                        for (var r = selectionRange.top; r <= selectionRange.top + selectionRange.height; r++) {
                            var row = [];
                            copyData.push(row)
                            for (var c = selectionRange.left; c <= selectionRange.left + selectionRange.width; c++) {
                                row.push(grid.dataModel.getCopyData(r, c));
                            }
                        }
                    }
                }
                break;
        }
    });
};