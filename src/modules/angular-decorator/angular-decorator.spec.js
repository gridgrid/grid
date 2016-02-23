var mockEvent = require('../custom-event');
var tools = require('jasmine-tools-riq');

describe('angular-decorator', function() {
    var moduleName = require('./index.js');

    require('../grid-spec-helper')();
    beforeEach(function() {
        angular.mock.module(moduleName);
    });

    describe('render', function() {
        beforeEach(function() {
            var compileObj;
            var self = this;
            angular.module(moduleName).config(function($provide) {
                    $provide.decorator('$compile', function($delegate) {
                        self.origCompile = $delegate;
                        if (!compileObj) {
                            compileObj = {
                                $compile: $delegate
                            };
                            spyOn(compileObj, '$compile').and.callThrough();
                        }
                        return compileObj.$compile;
                    });

                })
                .run(function($templateCache) {
                    $templateCache.put('foo.html', '<div></div>');
                });
            angular.module(moduleName)
                .directive('foo', function() {
                    return {
                        restrict: 'E',
                        replace: true,
                        templateUrl: 'foo.html',
                        link: function() {

                        }
                    };
                });
            tools.angularDeps.call(this, 'GridDecoratorSrvc');
            tools.angularDeps.call(this, '$compile', '$rootScope');
            this.$scope = this.$rootScope.$new();
            this.tpl = '<div>{{scopeValue}}</div>';
            this.render = (function(opts) {
                return this.GridDecoratorSrvc.render(angular.extend({
                    $scope: this.$scope,
                    template: this.tpl
                }, opts));
            }).bind(this);
        });

        it('should compile the tpl', function() {
            this.render();
            expect(this.$compile).toHaveBeenCalledWith(this.tpl);
        });

        it('should link with the scope provided', function() {
            var self = this;
            var linkSpy = jasmine.createSpy('link');
            linkSpy.and.callThrough();
            this.$compile.and.callFake(function(tpl) {
                linkSpy(tpl);
                var realLink = self.origCompile(tpl);
                return function(scope) {
                    linkSpy(scope);
                    return realLink(scope)
                }
            });
            this.render();
            expect(linkSpy).toHaveBeenCalledWith(this.$scope);
        });

        it('should call digest on compile', function() {
            var $digest = spyOn(this.$scope, '$digest');
            this.render();
            expect($digest).toHaveBeenCalled();
        });

        it('should return the compiled elem', function() {
            expect(this.render()).toBeAnElement();
        });

        it('should destroy the scope on decorator destroy', function() {
            var rendered = this.render();
            var destroy = spyOn(this.$scope, '$destroy');
            rendered.dispatchEvent(mockEvent('decorator-destroy'));
            expect(destroy).toHaveBeenCalled();
        });

        it('should remove the decorator-destroy listener on destroy', function(cb) {
            var rendered = this.render();
            rendered.dispatchEvent(mockEvent('decorator-destroy', true));
            var destroy = spyOn(this.$scope, '$destroy');
            setTimeout(function() {
                rendered.dispatchEvent(mockEvent('decorator-destroy', true));
                expect(destroy).not.toHaveBeenCalled();
                cb();
            }, 2);

        });

        it('should add pointer events all if events flag is set to true', function() {
            var rendered = this.render({
                events: true
            });
            expect(rendered.style.pointerEvents).toEqual('all');
        });

        it('should add pointer events even if root node is an element directive with replace true and templateUrl', function() {
            var rendered = this.render({
                events: true,
                template: '<foo></foo>'
            });
            expect(rendered.style.pointerEvents).toEqual('all');
        });
    });

    describe('headerDecorators', function() {
        beforeEach(function() {
            tools.angularDeps.call(this, 'GridDecoratorSrvc');
        });

        it('should call angular render on decorator render', function() {
            var renderOpts = {
                template: '<div>',
                scope: {}
            };
            var model = {
                annotateDecorator: function(dec) {
                    dec.renderOpts = renderOpts
                }
            }
            this.GridDecoratorSrvc.headerDecorators(this.buildSimpleGrid(), model);
            var dec = {};
            model.annotateDecorator(dec);
            var renderSpy = spyOn(this.GridDecoratorSrvc, 'render');
            dec.render();
            expect(renderSpy).toHaveBeenCalledWith(renderOpts);
        });

        it('should call previous annotate', function() {
            var spy = jasmine.createSpy();
            var model = {
                renderOpts: {
                    template: '<div>',
                    scope: {}
                },
                annotateDecorator: spy
            };
            this.GridDecoratorSrvc.headerDecorators(this.buildSimpleGrid(), model);
            var dec = {};
            model.annotateDecorator(dec);
            expect(spy).toHaveBeenCalledWith(dec);
        });
    });


});