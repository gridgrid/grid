module.exports = angular.module('grid-decorator', [])
    .factory('GridDecoratorSrvc', function ($compile) {
        return {
            render: function (opts) {
                var compiled = $compile(opts.template)(opts.$scope);
                compiled.on('decorator-destroy', function () {
                    opts.$scope.$destroy();
                    //unbind in a timeout to allow any other listeners to fire first
                    setTimeout(function () {
                        compiled.off('decorator-destroy');
                    }, 1);
                });
                opts.$scope.$apply();
                return  compiled[0];
            }
        }
    })

;