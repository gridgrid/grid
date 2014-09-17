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

            }
        };
    })
;


