'use strict';

var grid = require('@grid/riq-grid');

require('angular');

angular.module('riqGridApp', [])
    .directive('riqGridApp', function () {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="pin-to-edges">Grid App</div>',
            link: function ($scope, $elem) {
                var elem = $elem[0];

                var numRows = 1000;
                var numCols = 100;
                var grid = require('@grid/simple-grid')(numRows, numCols, [30], [40, 100, 400, 90], 1, 3);
                grid.navigationModel.navTo(1, 1);
                grid.viewLayer.build(elem);
                grid.viewLayer.draw();

                grid.eventLoop.setContainer(elem);

            }
        };
    })
;


