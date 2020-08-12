'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var simple_grid_1 = require("../modules/simple-grid");
require('../scss/grid-custom.scss');
var container = document.getElementsByClassName('grid-app-container')[0];
var numRows = 1000;
var numCols = 100;
var grid = simple_grid_1.default(numRows, numCols, [30], [50, 100, 400, 90], 1, 3, undefined, 1, 1, {
    allowEdit: true,
    snapToCell: false
});
grid.colModel.get(0).width = 60;
grid.colModel.get(2).width = 60;
grid.build(container);
grid.pixelScrollModel.maxIsAllTheWayFor.height = true;
grid.fps.logging = true;
for (var c = 0; c < grid.colModel.length(); c++) {
    if (c > 4 && c % 5 === 0) {
        grid.colModel.get(c).hidden = true;
    }
}
for (var r = 0; r < grid.rowModel.length(); r++) {
    var row = grid.rowModel.get(r);
    row.children = [];
    for (var s = 0; s < Math.floor(Math.random() * 5) + 1; s++) {
        var subRow = grid.rowModel.create();
        subRow.dataRow = s;
        subRow.dataLayer = 1;
        row.children.push(subRow);
    }
}
var builder = grid.colModel.createBuilder(function () {
    return document.createElement('a');
}, function (elem, ctx) {
    grid.viewLayer.setTextContent(elem, ctx.data.formatted);
    return elem;
});
var expansionColDescriptor = grid.colModel.get(0);
expansionColDescriptor.builder = grid.colModel.createBuilder(function (ctx) {
    var a = document.createElement('a');
    a.style.cursor = 'pointer';
    a.style.color = '#aaa';
    grid.eventLoop.bind(a, 'click', function () {
        var row = grid.rowModel.get(grid.view.row.toVirtual(ctx.viewRow));
        row.expanded = !row.expanded;
    });
    return a;
}, function (elem, ctx) {
    if (elem) {
        var row = grid.rowModel.get(ctx.virtualRow);
        elem.textContent = !row.children ? '' : '▸';
    }
    return elem;
});
grid.colModel.get(0).width = 30;
grid.colModel.get(2).builder = builder;
var headerRow = grid.rowModel.get(0);
headerRow.isBuiltActionable = false;
headerRow.builder = grid.rowModel.createBuilder(function () {
    var div = document.createElement('div');
    div.innerHTML = '<div><div></div><div style="color:#777;text-transform: capitalize;"></div></div>';
    return div.firstChild;
}, function (builtElem, ctx) {
    if (ctx.virtualCol === 0) {
        return builtElem;
    }
    if (builtElem) {
        builtElem.children[0].textContent = ctx.data.formatted;
        builtElem.children[1].textContent = 'header' + ctx.virtualCol;
    }
    return builtElem;
}, true);
headerRow.height = 40;
//# sourceMappingURL=index.js.map