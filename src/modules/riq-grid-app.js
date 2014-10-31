'use strict';

var makeSimpleGrid = require('@grid/simple-grid');
require('angular');
var debounce = require('@grid/debounce');

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

                var builder = grid.colBuilders.create(function () {
                    return $compile('<a>{{data.formatted}}</a>')($scope.$new())[0];
                }, function (elem, ctx) {
                    var scope = angular.element(elem).scope();
                    scope.data = ctx.data;
                    scope.$digest();
                    return elem;
                });

                grid.colBuilders.set(0, builder);
                grid.colBuilders.set(1, builder);
                grid.colBuilders.set(2, builder);

                //this really shouldn't be necessary but just to make sure
                grid.requestDraw();

            }
        };
    })
;


