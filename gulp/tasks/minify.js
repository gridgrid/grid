'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var rename = require('gulp-rename');

module.exports = gulp.task('minify', function () {
    return gulp.src(config.paths.dest.release.scripts + '/' + config.filenames.release.scripts)
        .pipe(ngAnnotate())
        .pipe(uglify({mangle: false}))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(config.paths.dest.release.scripts));
});
