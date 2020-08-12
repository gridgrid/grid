var $ = require("jquery");

exports.defineBasicMatcher = function defineBasicMatcher(passFn, messageFn) {
  return function () {
    return {
      compare: function (actual, expected) {
        var argsArray = Array.prototype.slice.call(arguments);
        var pass = passFn.apply(this, argsArray);
        argsArray.push(pass);

        return {
          pass: pass,
          message: messageFn && messageFn.apply(this, argsArray),
        };
      },
    };
  };
};

exports.expectedObjectWithNot = function expectedObjectWithNot(
  actual,
  pass,
  obj
) {
  try {
    actual = JSON.stringify(obj || actual);
  } catch (e) {
    actual = "actual";
  }
  return "Expected " + actual + (!pass ? "" : " not");
};

exports.angularDeps = function () {
  var self = this;

  var depNames = Array.prototype.slice.call(arguments, 0);
  depNames.push(function actualInjectedFunction() {
    var depsArray = Array.prototype.slice.call(arguments, 0);
    depsArray.forEach(function (dep, i) {
      self[depNames[i]] = dep;
    });
  });
  inject.call(this, depNames);
};

exports.lazyLoad = function (obj, name, createFn) {
  var prop;
  Object.defineProperty(obj, name, {
    get: function () {
      if (!prop) {
        prop = createFn();
      }
      return prop;
    },
  });
};

exports.findDTS = function (dts) {
  return $('[dts="' + dts + '"]');
};

exports.findDTSWithinElement = function (element, dts) {
  return element.find('[dts="' + dts + '"]');
};

exports.findDTSIn$Element = function (self, dts) {
  return findDTSWithinElement(self.$element, dts);
};
