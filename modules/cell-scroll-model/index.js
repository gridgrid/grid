"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dirty_clean_1 = require("../dirty-clean");
var util = require("../util");
function create(grid) {
    var dirtyClean = dirty_clean_1.default(grid);
    function makeDimension(gridDimension) {
        function convertVirtualToScroll(virtualCoord) {
            return virtualCoord - gridDimension.rowColModel.numFixed();
        }
        function getScrollToRowOrCol(virtualCoord) {
            var currentScroll = cellScrollDimension.position;
            var scrollTo = currentScroll;
            if (gridDimension.viewPort.isInView(virtualCoord)) {
                return scrollTo;
            }
            var targetScroll = convertVirtualToScroll(virtualCoord);
            if (targetScroll < currentScroll) {
                scrollTo = targetScroll;
            }
            else if (targetScroll > currentScroll) {
                var lengthToCell = gridDimension.virtualPixelCell.sizeOf(0, virtualCoord);
                var numFixed = gridDimension.rowColModel.numFixed();
                scrollTo = 0;
                for (var i = numFixed; i < virtualCoord && lengthToCell > gridDimension.viewPort.size; i++) {
                    lengthToCell -= gridDimension.virtualPixelCell.sizeOf(i);
                    scrollTo = i - (numFixed - 1);
                }
            }
            return scrollTo;
        }
        var cellScrollDimension = {
            position: 0,
            scrollTo: function (position, dontFire) {
                var maxPosition = (gridDimension.rowColModel.length() || 1) - 1;
                var lastPosition = cellScrollDimension.position;
                cellScrollDimension.position = util.clamp(position, 0, maxPosition);
                if (lastPosition !== cellScrollDimension.position) {
                    dirtyClean.setDirty();
                    if (!dontFire) {
                        notifyListeners();
                    }
                    return true;
                }
                return false;
            },
            getPixelScroll: function () {
                return gridDimension.virtualPixelCell.sizeOf(gridDimension.rowColModel.numFixed(), cellScrollDimension.position + gridDimension.rowColModel.numFixed() - 1);
            },
            getScrollIntoViewCell: function (dataCell) {
                var virtualCell = gridDimension.converters.virtual.clamp(gridDimension.converters.data.toVirtual(dataCell));
                return getScrollToRowOrCol(virtualCell);
            }
        };
        return cellScrollDimension;
    }
    var model = {
        get col() {
            return model.colInfo.position;
        },
        get row() {
            return model.rowInfo.position;
        },
        isDirty: dirtyClean.isDirty,
        rowInfo: makeDimension(grid.rows),
        colInfo: makeDimension(grid.cols),
        scrollTo: function (r, c, dontFire, dontNotifyPixelModel) {
            if (isNaN(r) || isNaN(c)) {
                return;
            }
            var rowScrollChange = model.rowInfo.scrollTo(r, true);
            var colScrollChange = model.colInfo.scrollTo(c, true);
            if (rowScrollChange || colScrollChange) {
                if (!dontFire) {
                    notifyListeners(dontNotifyPixelModel);
                }
            }
        },
        scrollIntoView: function (dataRow, dataCol) {
            var newRow = model.rowInfo.getScrollIntoViewCell(dataRow);
            var newCol = model.colInfo.getScrollIntoViewCell(dataCol);
            model.scrollTo(newRow, newCol);
        }
    };
    function notifyListeners(dontNotifyPixelModel) {
        grid.eventLoop.fire('grid-cell-scroll');
        if (!dontNotifyPixelModel) {
            grid.pixelScrollModel.scrollTo(model.rowInfo.getPixelScroll(), model.colInfo.getPixelScroll(), true);
        }
    }
    grid.eventLoop.bind('grid-row-change', function (e) {
        switch (e.action) {
            case 'remove':
                model.scrollTo(0, model.col);
                break;
        }
    });
    return model;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=index.js.map