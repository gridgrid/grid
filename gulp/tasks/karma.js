var gulp = require('gulp');
var karma = require('gulp-karma');

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