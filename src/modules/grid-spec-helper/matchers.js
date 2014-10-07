(function () {
    function addFieldMatcher(matchers, fieldName) {
        matchers[fieldName + 'ToBe'] = function (val) {
            this.message = function () {
                return 'Expected ' + fieldName + (this.isNot ? ' not' : '') + ' to be ' + val + ' but it was ' + actualVal;
            };
            var actualVal = this.actual[fieldName];
            return actualVal === val;
        };
    }

    var $ = require('jquery');
    var matchers = {
        toBeDisplayNone: function () {
            var elem = this.actual;
            return jasmine.getEnv().equals_(elem.css('display'), ('none'));
        },

        //determines visibillity based on display none for now irrespective of attachement to the document
        toBeVisible: function () {
            var element = this.actual;
            if (!element || !angular.isFunction(element.parent)) {
                return false;
            }
            var lastParent = element;
            do {
                if (lastParent.length === 0 || lastParent.css('display') === 'none' || lastParent.hasClass('ng-hide')) {
                    return false;
                }
                lastParent = lastParent.parent();
            } while (lastParent.length > 0);
            return true;
        },

        toBeDisabled: function () {
            var disabled = this.actual.attr('disabled');
            return disabled === true || disabled === 'true' || disabled === 'disabled';
        },
        toBeNaN: function () {
            return isNaN(this.actual);
        },
        toBeANumber: function () {
            return angular.isNumber(this.actual);
        },
        toBeAFunction: function () {
            return angular.isFunction(this.actual);
        },

        toBeAnObject: function () {
            return angular.isObject(this.actual);
        },

        toBeAnArray: function () {
            return angular.isArray(this.actual);
        },
        toBeAString: function () {
            return angular.isString(this.actual);
        },
        toBeNully: function () {
            return this.actual === undefined || this.actual === null;
        },
        toBeAnElement: function () {
            return !!(this.actual &&
            (this.actual.nodeName || // we are a direct element
            (this.actual.prop && this.actual.attr && this.actual.find)));
        },
        toHaveBeenCalledWithAll: function (argsArrays) {
            var spy = this.actual;
            this.message = function () {
                return 'Expected spy to have been called with all of ' + argsArrays + ' but instead got ' + spy.argsForCall;
            };

            var numCalls = spy.callCount === argsArrays.length;
            var allArrgs = true;
            argsArrays.forEach(function (args, index) {
                var argsForCall = spy.argsForCall[index];
                if (!argsForCall) {
                    allArrgs = false;
                } else {
                    if (angular.isArray(args)) {
                        args.forEach(function (arg, index) {
                            if (arg !== argsForCall[index]) {
                                allArrgs = false;
                            }
                        });
                    } else {
                        if (args !== argsForCall[0]) {
                            allArrgs = false;
                        }
                    }
                }
            });
            return numCalls && allArrgs;
        },
        toHaveClass: function (className) {
            this.message = function () {
                return 'Expected "' + $(this.actual).attr('class') + '"' + (this.isNot ? ' not' : '') + ' to have class "' + className + '"';
            };
            return $(this.actual).hasClass(className);
        },
        toBeDirty: function () {
            var isDirty = this.actual.isDirty();
            this.message = function () {
                return 'Expected ' + JSON.stringify(this.actual) + (this.isNot ? ' not' : '') + ' to be dirty but instead isDirty() was ' + isDirty;
            };
            return isDirty;
        },
        toBeClean: function () {
            this.message = function () {
                return 'Expected ' + JSON.stringify(this.actual) + (this.isNot ? ' not' : '') + ' to be clean';
            };
            return this.actual.isClean();
        }
    };

    var commonFields = ['row', 'col', 'top', 'left', 'width', 'height', 'units', 'space', 'class'];
    commonFields.forEach(function (fieldName) {
        addFieldMatcher(matchers, fieldName);
    });

    beforeEach(function () {
        this.addMatchers(matchers);
    });
})();