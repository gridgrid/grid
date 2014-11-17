var gulp = require('gulp');
var karma = require('gulp-karma');
var argv = require('yargs').argv;
var istanbul = require('browserify-istanbul');

var karmaConf;
require('../../karma.conf.js')({
    set: function (conf) {
        karmaConf = conf;
    }
});
gulp.task('karma', function () {
    return gulp.src(karmaConf.files)
        .pipe(karma({
            configFile: 'karma.conf.js',
            action: 'run'
        }));
});

gulp.task('karma-watch', function () {
    console.log('starting karma watch');
    var opts = {
        configFile: 'karma.conf.js',
        action: 'watch'
    };
    opts.browserify = {
        cache: {}, packageCache: {}, fullPaths: true, debug: true
    };
    if (argv.coverage) {
        opts.browserify.transform = [['browserify-istanbul', {
            ignore: ['**/bower_components/**', '**/templates.js', '**/proto/**', '**/grid-spec-helper/**', '**/*.spec.js', '**/node_modules/!(@grid)/**', '**/src/modules/**'],
            defaultIgnore: false
        }]];

    }

    return gulp.src(karmaConf.files)
        .pipe(karma(opts));
});