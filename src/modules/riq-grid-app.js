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
            template: '<div>Grid App</div>',
            link: function ($scope, elem) {

                var numRows = 1000;
                var numCols = 100;
                var grid = {};
                grid.rowModel = require('@grid/row-model')(grid);
                grid.colModel = require('@grid/col-model')(grid);
                grid.dataModel = require('@grid/simple-data-model')(grid);
                grid.cellScrollModel = require('@grid/cell-scroll-model')(grid);

                if (numRows) {
                    for (var r = 0; r < numRows; r++) {
                        grid.rowModel.add({});
                        if (numCols) {
                            for (var c = 0; c < numCols || 0; c++) {
                                if (r === 0) {
                                    grid.colModel.add({});
                                }
                                grid.dataModel.set(r, c, {value: r + '-' + c});
                            }
                        }
                    }
                }

                grid.viewModel = require('@grid/view-layer')(grid);
                grid.viewModel.build(elem[0]);
                grid.viewModel.draw();

            }
        };
    })
;


