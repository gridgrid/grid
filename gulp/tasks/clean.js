'use strict';

var gulp = require('gulp');
var gulpif = require('gulp-if');
var rimraf = require('gulp-rimraf');
var debug = require('gulp-debug');

module.exports = gulp.task('clean', function () {
    return gulp.src(release ? RELEASE_FOLDER : BUILD_FOLDER, {read: false})
        .pipe(rimraf());
});
