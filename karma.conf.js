module.exports = function (config) {
    var testsGlob = 'src/modules/!(proto)/*.spec.js';
    var preprocessors = {};
    preprocessors[testsGlob] = ['browserify'];
    preprocessors['src/modules/grid-spec-helper/matchers.js'] = ['browserify'];
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        frameworks: ['browserify', 'jasmine'],

        files: [
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'src/modules/grid-spec-helper/matchers.js',
            testsGlob
        ],
        exclude: [],

        preprocessors: preprocessors,

        reporters: ['progress', /*'story',*/ 'coverage'],

        port: 9876,

        colors: true,

        logLevel: config.LOG_DEBUG,

        autoWatch: true,

        browsers: ['PhantomJS'],

        browserNoActivityTimeout: 3000000,

        singleRun: false,

        reportSlowerThan: 250

    });
};
