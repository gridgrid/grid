angular.module('riq-grid', [])
    .factory('RiqGridSrvc', function () {
        return {
            core: require('./core')
        };
    })
;

