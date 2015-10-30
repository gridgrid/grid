module.exports = function(config) {
    // store the karma config in a JSON file to make it easy to change w/jq
    var contents = require('fs').readFileSync('karma.conf.json');
    config.set(JSON.parse(contents));
};
