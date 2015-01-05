module.exports = angular.module('grid-decorator', [])
    .factory('GridDecoratorSrvc', function ($compile) {
        var GridDecoratorSrvc = {
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
            },
            headerDecorators: function (grid, model) {
                var origAnnotate = model.annotateDecorator;
                model.annotateDecorator = function (dec) {
                    dec.render = function () {
                        return GridDecoratorSrvc.render(dec.renderOpts);
                    };
                    if (origAnnotate) {
                        origAnnotate(dec);
                    }
                };

                require('../header-decorators')(grid, model);
            }
        };
        return  GridDecoratorSrvc
    })

;