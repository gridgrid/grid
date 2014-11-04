(function () {
    function addFieldMatcher(matchers, fieldName) {
        matchers[fieldName + 'ToBe'] = function () {
            return {
                compare: function (actual, val) {
                    var actualVal = actual[fieldName];
                    var pass = actualVal === val;
                    return {
                        pass: pass,
                        message: expectedObjectWithNot(actual, pass) + ' \nto have ' + fieldName + ' value of ' + val + ' but it was ' + actualVal + '\n'

                    };
                }

            };
        };
    }

    var $ = require('jquery');

    function expectedObjectWithNot(actual, pass, obj) {
        try {
            actual = JSON.stringify(obj || actual);
        } catch (e) {
            actual = 'actual';
        }
        return 'Expected ' + actual + (pass ? '' : ' not' );
    }

    function makeFakeRange(t, l, h, w) {
        return {top: t, left: l, height: h, width: w};
    }

    function makeFakePosRange(t, l, r, b) {
        return {top: t, left: l, right: r, bottom: b};
    }

    function maybeAddPx(v) {
        return typeof v === 'string' ? v : v + 'px';
    }

    function defineBasicMatcher(passFn, messageFn) {
        return function () {
            return {
                compare: function (actual, expected) {
                    var pass = passFn(actual, expected);
                    return {
                        pass: pass,
                        message: messageFn && messageFn(actual, expected, pass)
                    };
                }
            };
        };
    }

    var matchers = {

        toBeANumber: defineBasicMatcher(function (actual) {
            return angular.isNumber(actual);
        }),
        toBeAFunction: defineBasicMatcher(function (actual) {
            return angular.isFunction(actual);
        }),

        toBeAnObject: defineBasicMatcher(function (actual) {
            return angular.isObject(actual);
        }),

        toBeAnArray: defineBasicMatcher(function (actual) {
            return angular.isArray(actual);
        }),
        toBeAString: defineBasicMatcher(function (actual) {
            return angular.isString(actual);
        }),
        toBeNully: defineBasicMatcher(function (actual) {
            return actual === undefined || actual === null;
        }),
        toBeAnElement: defineBasicMatcher(function (actual) {
            return !!(actual &&
            (actual.nodeName || // we are a direct element
            (actual.prop && actual.attr && actual.find)));
        }),
        toHaveBeenCalledWithAll: function () {
            return {
                compare: function (actual, argsArrays) {
                    var spy = actual;

                    var numCalls = spy.calls.count() === argsArrays.length;
                    var allArrgs = true;
                    argsArrays.forEach(function (args, index) {
                        var argsForCall = spy.calls.argsFor(index);
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
                    return {
                        pass: numCalls && allArrgs,
                        message: 'Expected spy to have been called with all of ' + argsArrays + ' but instead got ' + spy.calls.allArgs()
                    };
                }
            };
        },
        toHaveClass: defineBasicMatcher(function (actual, className) {
            return $(actual).hasClass(className);
        }, function (actual, expected, pass) {
            return 'Expected "' + $(actual).attr('class') + '"' + (pass ? ' not' : '') + ' to have class "' + expected + '"';
        }),
        toBeDirty: defineBasicMatcher(function (actual) {
            return actual.isDirty();
        }, function (actual, expected, pass) {
            return expectedObjectWithNot(actual, pass) + ' to be dirty';
        }),
        toBeClean: defineBasicMatcher(function (actual) {
            return actual.isClean();
        }, function (actual, exp, pass) {
            return expectedObjectWithNot(actual, pass) + ' to be clean';
        }),

        toHaveField: defineBasicMatcher(function (actual, exp) {
            return exp in actual;
        }, function (actual, exp, pass) {
            return expectedObjectWithNot(actual, pass) + ' to have field: ' + exp;
        }),
        rangeToBe: function () {
            return {
                compare: function (actual, t, l, h, w) {
                    var pass = actual.top === t && actual.left === l && actual.height === h && actual.width === w;
                    return {
                        pass: pass,
                        message: expectedObjectWithNot(actual, pass, makeFakeRange(actual.top, actual.left, actual.height, actual.width)) + ' to be ' + JSON.stringify(makeFakeRange(t, l, h, w))
                    };
                }
            };
        },
        toContainAll: defineBasicMatcher(function (actual, array) {
            array.forEach(function (item) {
                if (actual.indexOf(item) === -1) {
                    return false;
                }
            });
            return true;
        }),
        toBePositioned: function () {
            return {
                compare: function (actual, t, l, b, r) {
                    var top = $(actual).css('top');
                    var left = $(actual).css('left');
                    var right = $(actual).css('right');
                    var bottom = $(actual).css('bottom');
                    var pos = $(actual).css('position');
                    var pass = top === maybeAddPx(t) &&
                        left === maybeAddPx(l) &&
                        right === maybeAddPx(r) &&
                        bottom === maybeAddPx(b) &&
                        pos === 'absolute';
                    return {
                        pass: pass,
                        message: expectedObjectWithNot(actual, pass, makeFakePosRange(top, left, right, bottom)) + ' to be positioned ' + JSON.stringify(makeFakePosRange(t, l, r, b))
                    };
                }
            };
        },
        toHaveBeenBoundWith: defineBasicMatcher(function (actual, name, elem) {
            var spy = actual;
            var hasName = spy.calls.argsFor(0)[0] === name;
            var hasElem = !elem || spy.calls.argsFor(0)[1] === elem;
            var isFunction = hasElem && angular.isFunction(spy.calls.argsFor(0)[2]) || angular.isFunction(spy.calls.argsFor(0)[1]);
            return hasName && hasElem && isFunction;
        })
    };

    var commonFields = ['row', 'col', 'top', 'left', 'width', 'height', 'units', 'space', 'class', 'gridX', 'gridY'];
    commonFields.forEach(function (fieldName) {
        addFieldMatcher(matchers, fieldName);
    });

    beforeEach(function () {
        jasmine.addMatchers(matchers);
    });
})
();