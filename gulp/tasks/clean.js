'use strict';

var gulp = require('gulp');
var rimraf = require('gulp-rimraf');
var debug = require('gulp-debug');
var shell = require('gulp-shell');

module.exports = gulp.task('clean', function () {
    var folder = release ? RELEASE_FOLDER : BUILD_FOLDER;
    return gulp.src(folder, {read: false})
        .pipe(shell(['git ls-files -z ' + folder + '/ | xargs -0 git update-index --assume-unchanged']))
        .pipe(rimraf());
});
