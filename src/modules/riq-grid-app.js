'use strict';

var makeSimpleGrid = require('./simple-grid');
require('angular');
var debounce = require('./debounce');

angular.module('riqGridApp', [])
    .directive('riqGridApp', function ($compile) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="pin-to-edges overflow-hidden">Grid App</div>',
            link: function ($scope, $elem) {
                var elem = $elem[0];

                var numRows = 1000;
                var numCols = 100;

                var grid = makeSimpleGrid(numRows, numCols, [30], [40, 100, 400, 90], 1, 3, undefined, 1, 1);
                grid.colModel.get(0).width = 60;
                grid.colModel.get(2).width = 40;
                grid.build(elem);
                grid.navigationModel.minRow = 1;

                //hide columsn for testing
                for (var c = 0; c < grid.colModel.length(); c++) {
                    if (c % 3 === 0) {
                        grid.colModel.get(c).hidden = true;
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

                grid.colModel.get(0).builder = builder;
                grid.colModel.get(1).builder = builder;
                grid.colModel.get(2).builder = builder;

                var headerRow = grid.rowModel.get(0);
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
    })
;


