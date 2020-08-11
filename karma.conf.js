var webpackConfig = require("./webpack/webpack.config.js");

module.exports = function (config) {
  var configObject = {
    frameworks: ["jasmine"],
    basePath: "",
    files: [
      "node_modules/polyfill-function-prototype-bind/bind.js",
      "node_modules/es6-promise/dist/es6-promise.js",
      "src/modules/grid-spec-helper/matchers.js",
      "webpack/test-entry.js",
    ],
    preprocessors: {
      "webpack/test-entry.js": ["webpack", "sourcemap"],
      "src/modules/grid-spec-helper/matchers.js": ["webpack", "sourcemap"],
    },
    webpackMiddleware: {
      noInfo: true,
    },
    autoWatch: true,
    reporters: ["progress"],
    browsers: ["ChromeHeadless"],
    junitReporter: {
      outputFile: "test_out/unit.xml",
      suite: "unit",
    },
    notifyReporter: {
      reportSuccess: false,
    },
    browserNoActivityTimeout: 3000000,
    reportSlowerThan: 250,
    webpack: webpackConfig(false, true),
  };
  config.set(configObject);
};

