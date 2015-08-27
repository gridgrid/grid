var moduleName = 'grid';
module.exports = moduleName;

angular.module(moduleName, [
    require('./angular-decorator'),
    require('./angular-builder')
])

.factory('GridSrvc', function() {
    return {
        core: require('./core')
    };
});