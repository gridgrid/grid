'use strict';

var grid = require('@grid/riq-grid');
require('jquery');
require('sugar');
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
                var grid = require('@grid/simple-grid')(numRows, numCols);


                grid.viewModel = require('@grid/view-layer')(grid);
                grid.viewModel.build(elem);
                grid.viewModel.draw();

                grid.eventLoop.bind(elem);

            }
        };
    })
;


