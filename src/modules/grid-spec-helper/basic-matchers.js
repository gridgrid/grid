(function () {
  function isFunction(fn) {
    return typeof fn === "function";
  }

  function makeFakePosRange(t, l, r, b) {
    return {
      top: t,
      left: l,
      right: r,
      bottom: b,
    };
  }

  function maybeAddPx(v) {
    return typeof v === "string" ? v : v + "px";
  }

  var $ = require("jquery");
  var tools = require("./helper-matchers.js");

  var passFn = function (actual, array) {
    array.forEach(function (item) {
      if (actual.indexOf(item) === -1) {
        return false;
      }
    });
    return true;
  };

  function containAll(actual, array) {
    array.forEach(function (item) {
      if (actual.indexOf(item) === -1) {
        return false;
      }
    });
    return true;
  }

  var matchers = {
    toBeANumber: tools.defineBasicMatcher(function (actual) {
      return typeof actual === "number";
    }),
    toBeAFunction: tools.defineBasicMatcher(function (actual) {
      return typeof actual === "function";
    }),

    toBeAnObject: tools.defineBasicMatcher(function (value) {
      return value !== null && typeof value === "object";
    }),

    toBeAnArray: tools.defineBasicMatcher(function (actual) {
      return Array.isArray(actual);
    }),
    toBeAString: tools.defineBasicMatcher(function (actual) {
      return typeof actual === "string";
    }),
    toBeNully: tools.defineBasicMatcher(function (actual) {
      return actual === undefined || actual === null;
    }),
    toBeAnElement: tools.defineBasicMatcher(function (actual) {
      return !!(
        actual &&
        (actual.nodeName || // we are a direct element
          (actual.prop && actual.attr && actual.find))
      );
    }),
    toHaveField: tools.defineBasicMatcher(
      function (actual, exp) {
        return exp in actual;
      },
      function (actual, exp, pass) {
        return (
          tools.expectedObjectWithNot(actual, pass) + " to have field: " + exp
        );
      }
    ),
    toContainAll: tools.defineBasicMatcher(containAll),
    toContainOnly: tools.defineBasicMatcher(function (actual, array) {
      return actual.length === array.length && containAll(actual, array);
    }),
    toHaveClass: tools.defineBasicMatcher(
      function (actual, className) {
        return $(actual).hasClass(className);
      },
      function (actual, expected, pass) {
        return (
          'Expected "' +
          $(actual).attr("class") +
          '"' +
          (pass ? " not" : "") +
          ' to have class "' +
          expected +
          '"'
        );
      }
    ),
    toBePositioned: function () {
      return {
        compare: function (actual, t, l, b, r) {
          var top = $(actual).css("top");
          var left = $(actual).css("left");
          var right = $(actual).css("right");
          var bottom = $(actual).css("bottom");
          var pos = $(actual).css("position");
          var pass =
            top === maybeAddPx(t) &&
            left === maybeAddPx(l) &&
            right === maybeAddPx(r) &&
            bottom === maybeAddPx(b) &&
            pos === "absolute";
          return {
            pass: pass,
            message:
              tools.expectedObjectWithNot(
                actual,
                pass,
                makeFakePosRange(top, left, right, bottom)
              ) +
              " to be positioned " +
              JSON.stringify(makeFakePosRange(t, l, r, b)),
          };
        },
      };
    },
    toBeDisplayNone: tools.defineBasicMatcher(function (actual) {
      var elem = actual;
      return jasmine.getEnv().equals_(elem.css("display"), "none");
    }),

    // determines visibillity based on display none for now irrespective of attachement to the document
    toBeDisplayable: tools.defineBasicMatcher(function (actual) {
      var element = actual;
      if (!element || !isFunction(element.parent)) {
        return false;
      }
      var lastParent = element;
      do {
        if (
          lastParent.length === 0 ||
          (lastParent[0] !== window &&
            lastParent[0] !== document &&
            (lastParent.css("display") === "none" ||
              lastParent.hasClass("ng-hide")))
        ) {
          return false;
        }
        lastParent = lastParent.parent();
      } while (lastParent.length > 0);
      return true;
    }),
    toContainReference: tools.defineBasicMatcher(function (actual, val) {
      return actual.any(function (item) {
        return val === item;
      });
    }),

    toBeDisabled: tools.defineBasicMatcher(function (actual) {
      var disabled = actual.attr("disabled");
      return (
        disabled === true || disabled === "true" || disabled === "disabled"
      );
    }),

    toContainAny: tools.defineBasicMatcher(function (actual, val) {
      return isFunction(actual.any) && actual.any(val);
    }),
    toHaveOnlyTruthyProperty: tools.defineBasicMatcher(
      function (actual, propertyName, includeFunctionReturnValues) {
        return Object.keys(actual).every(function (key) {
          var value =
            typeof actual[key] === "function" && includeFunctionReturnValues
              ? actual[key]()
              : actual[key];
          return key === propertyName ? !!value : !value;
        });
      },
      function (actual, propertyName, includeFunctionReturnValues, pass) {
        return (
          'Expected "' +
          propertyName +
          '"' +
          (pass ? " not" : "") +
          " to be only truthy value of the given object."
        );
      }
    ),
  };

  beforeEach(function () {
    jasmine.addMatchers(matchers);
  });
})();
