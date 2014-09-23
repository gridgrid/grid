// Karma configuration
// Generated on Tue Aug 26 2014 11:41:09 GMT-0700 (PDT)

module.exports = function (config) {
    config.set({

            // base path that will be used to resolve all patterns (eg. files, exclude)
            basePath: '',


            // frameworks to use
            // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
            frameworks: ['jasmine'],


// list of files / patterns to load in the browser
            files: [
                'test-assets/matchers.js',
                'node_modules/jquery/jquery.js',
                'bower_components/angular/angular.js',
                'bower_components/angular-mocks/angular-mocks.js',
                //'node_modules/sugar/release/sugar-full.development.js',
                'test-assets/bundle-tests.js'
            ],


            // list of files to exclude
            exclude: [],


// test results reporter to use
// possible values: 'dots', 'progress'
// available reporters: https://npmjs.org/browse/keyword/karma-reporter
            reporters: ['story', 'coverage'],


            // web server port
            port: 9876,


            // enable / disable colors in the output (reporters and logs)
            colors: true,


            // level of logging
            // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
            logLevel: config.LOG_INFO,


            // enable / disable watching file and executing tests whenever any file changes
            autoWatch: true,


            // start these browsers
            // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
            browsers: ['PhantomJS'],

            browserNoActivityTimeout: 3000000,


            // Continuous Integration mode
            // if true, Karma captures browsers, runs the tests and exits
            singleRun: false,

            
        }
    )
    ;
}
;
