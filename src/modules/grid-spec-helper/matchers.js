(function () {
    var tools = require('jasmine-tools-riq');
    require('jasmine-tools-riq/basic-matchers');

    function addFieldMatcher(matchers, fieldName) {
        matchers[fieldName + 'ToBe'] = function () {
            return {
                compare: function (actual, val) {
                    var actualVal = actual[fieldName];
                    var pass = actualVal === val;
                    return {
                        pass: pass,
                        message: tools.expectedObjectWithNot(actual, pass) + ' \nto have ' + fieldName + ' value of ' + val + ' but it was ' + actualVal + '\n'

                    };
                }

            };
        };
    }

    var $ = require('jquery');


    function makeFakeRange(t, l, h, w) {
        return {top: t, left: l, height: h, width: w};
    }

    function makeFakePosRange(t, l, r, b) {
        return {top: t, left: l, right: r, bottom: b};
    }

    function maybeAddPx(v) {
        return typeof v === 'string' ? v : v + 'px';
    }

    var matchers = {

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
        toBeDirty: tools.defineBasicMatcher(function (actual) {
            return actual.isDirty();
        }, function (actual, expected, pass) {
            return tools.expectedObjectWithNot(actual, pass) + ' to be dirty';
        }),
        toBeClean: tools.defineBasicMatcher(function (actual) {
            return actual.isClean();
        }, function (actual, exp, pass) {
            return tools.expectedObjectWithNot(actual, pass) + ' to be clean';
        }),
        rangeToBe: function () {
            return {
                compare: function (actual, t, l, h, w) {
                    var pass = actual.top === t && actual.left === l && actual.height === h && actual.width === w;
                    return {
                        pass: pass,
                        message: tools.expectedObjectWithNot(actual, pass, makeFakeRange(actual.top, actual.left, actual.height, actual.width)) + ' to be ' + JSON.stringify(makeFakeRange(t, l, h, w))
                    };
                }
            };
        },
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
                        message: tools.expectedObjectWithNot(actual, pass, makeFakePosRange(top, left, right, bottom)) + ' to be positioned ' + JSON.stringify(makeFakePosRange(t, l, r, b))
                    };
                }
            };
        },
        toHaveBeenBoundWith: tools.defineBasicMatcher(function (actual, name, elem) {
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