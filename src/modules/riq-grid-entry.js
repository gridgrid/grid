module.exports =
    angular.module('riq-grid', [
        require('./angular-decorator').name,
        require('./angular-builder').name
    ])
    .factory('RiqGridSrvc', function() {
        return {
            core: require('./core')
        };
    });