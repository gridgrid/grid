var webpackConfig = require('./webpack/webpack.config.js');

module.exports = function(config) {
    // store the karma config in a JSON file to make it easy to change w/jq
    var jsResult = JSON.parse(require('fs').readFileSync('karma.conf.json'));
    jsResult.webpack = webpackConfig(false, true);
    config.set(jsResult);
};