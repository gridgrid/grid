var moduleName = 'grid-decorator';
module.exports = moduleName;

angular.module(moduleName, [])

.factory('GridDecoratorSrvc', ['$compile', function($compile) {
    var GridDecoratorSrvc = {
        render: function(opts) {
            var compiled = $compile(opts.template)(opts.$scope);
            opts.$scope.$digest();

            // this absolutely has to happend after apply or the binding is to the wrong element (in fact anything you need to do has to happen after the apply)
            compiled.on('decorator-destroy', function() {
                opts.$scope.$destroy();
                // unbind in a timeout to allow any other listeners to fire first
                setTimeout(function() {
                    compiled.remove();
                    compiled.off('decorator-destroy');
                }, 1);
            });
            if (opts.events) {
                compiled[0].style.pointerEvents = 'all';
            }
            return compiled[0];
        },
        headerDecorators: function(grid, model) {
            var origAnnotate = model.annotateDecorator;
            model.annotateDecorator = function(dec) {
                dec.render = function() {
                    return GridDecoratorSrvc.render(dec.renderOpts);
                };
                if (origAnnotate) {
                    origAnnotate(dec);
                }
            };

            require('../header-decorators')(grid, model);
        }
    };
    return GridDecoratorSrvc
}])

;