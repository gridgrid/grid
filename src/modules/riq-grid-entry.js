angular.module('riq-grid', [
  require('./angular-decorator').name
])
  .factory('RiqGridSrvc', function () {
    return {
      core: require('./core')
    };
  })
;

