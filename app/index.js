'use strict';

var makeSimpleGrid = require('../src/modules/simple-grid');
require('angular');
var debounce = require('../src/modules/debounce');

angular.module('gridApp', [])
    .directive('gridApp', function ($compile) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="pin-to-edges overflow-hidden">Grid App</div>',
            link: function ($scope, $elem) {
                var elem = $elem[0];

                var numRows = 1000;
                var numCols = 100;

                var grid = makeSimpleGrid(numRows, numCols, [30], [40, 100, 400, 90], 1, 3, undefined, 1, 1, {
                    allowEdit: true,
                    snapToCell: false
                });
                grid.colModel.get(0).width = 60;
                grid.colModel.get(2).width = 40;
                grid.build(elem);
                grid.navigationModel.minRow = 1;
                grid.pixelScrollModel.maxIsAllTheWayFor.height = true;
                grid.fps.logging = true;

                //hide columsn for testing
                for (var c = 0; c < grid.colModel.length(); c++) {
                    if (c % 3 === 1) {
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
                    return $compile('<a>{{data.formatted}}</a>')($scope.$new())[0];
                }, function (elem, ctx) {
                    var scope = angular.element(elem).scope();
                    scope.data = ctx.data;
                    scope.$digest();
                    return elem;
                });

                var expansionColDescriptor = grid.colModel.get(0);
                expansionColDescriptor.builder = grid.colModel.createBuilder(function (ctx) {
                    var a = document.createElement('a');
                    a.style.cursor = "pointer";
                    grid.eventLoop.bind('click', a, function () {
                        var row = grid.rowModel.get(grid.view.row.toVirtual(ctx.viewRow));
                        row.expanded = !row.expanded;
                    });
                    return a;
                }, function update(elem, ctx) {
                    var row = grid.rowModel.get(ctx.virtualRow);
                    if (!row.children) {
                        elem.textContent = '';
                    } else if (row.expanded) {
                        elem.textContent = "V";
                    } else {
                        elem.textContent = ">"
                    }
                    return elem;
                });
                grid.colModel.get(0).width = 30;
                grid.colModel.get(1).builder = builder;
                grid.colModel.get(2).builder = builder;

                var headerRow = grid.rowModel.get(0);
                headerRow.isBuiltActionable = false;
                headerRow.builder = grid.rowModel.createBuilder(function () {
                    return $compile('<div><div>{{line1}}</div><div style="color:hotpink;">{{line2}}</div></div>')($scope.$new())[0];
                }, function (elem, ctx) {
                    var scope = angular.element(elem).scope();
                    scope.line1 = ctx.data.formatted;
                    scope.line2 = 'header' + ctx.virtualCol;
                    scope.$digest();
                    return elem;
                });

                headerRow.height = 40;


                //this really shouldn't be necessary but just to make sure
                grid.requestDraw();

            }
        };
    });
