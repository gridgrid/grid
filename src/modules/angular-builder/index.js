var moduleName = 'grid-builder';
module.exports = moduleName;

angular.module(moduleName, [])

.factory('GridBuilderSrvc', ['$compile', function($compile) {
    var GridBuilderSrvc = {};

    GridBuilderSrvc.destroy = function(elem) {
        if (elem) {
            var $prevElem = angular.element(elem);
            // if this thing doesn't actually have scope we will be destroying an inherited scope which is baaaaad
            if (!$prevElem.data('$scope')) {
                return;
            }
            var $previousScope = $prevElem.scope();
            if ($previousScope) {
                $previousScope.$destroy();
            }
            $prevElem.remove();
        }
    }

    GridBuilderSrvc.render = function($scope, tpl, initScopeFn) {
        var scope = $scope.$new();
        if (initScopeFn) {
            initScopeFn(scope);
        }
        var $elem = $compile(tpl)(scope);

        $elem.on('grid-rendered-elem-destroy', function() {
            GridBuilderSrvc.destroy($elem);
        });
        return $elem[0];
    };

    return GridBuilderSrvc;
}]);