module.exports =
    angular.module('grid', [
        require('./angular-decorator').name,
        require('./angular-builder').name
    ])
    .factory('GridSrvc', function() {
        return {
            core: require('./core')
        };
    });