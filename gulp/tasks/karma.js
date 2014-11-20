var gulp = require('gulp');
var karma = require('gulp-karma');
var argv = require('yargs').argv;

var karmaConf;
require('../../karma.conf.js')({
    set: function (conf) {
        karmaConf = conf;
    }
});

function setupKarmaOpts(action) {
    var opts = {
        configFile: 'karma.conf.js',
        action: action
    };
    opts.browserify = {
        cache: {}, packageCache: {}, fullPaths: true, debug: true
    };
    if (argv.coverage) {
        opts.browserify.transform = [
            ['browserify-istanbul', {
                ignore: ['**/bower_components/**', '**/templates.js', '**/proto/**', '**/grid-spec-helper/**', '**/*.spec.js', '**/node_modules/!(@grid)/**', '**/src/modules/**'],
                defaultIgnore: false
            }]
        ];

    }
    return opts;
}
gulp.task('karma-watch', function () {
    return gulp.src(karmaConf.files)
        .pipe(karma(setupKarmaOpts('watch')));
});

gulp.task('karma', function () {
    return gulp.src(karmaConf.files)
        .pipe(karma(setupKarmaOpts('run')));
});