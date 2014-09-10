'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var streamify = require('gulp-streamify');
var source = require('vinyl-source-stream');
var browserifyShim = require('browserify-shim');
var footer = require('gulp-footer');
var debug = require('gulp-debug');
var exorcist = require('exorcist');
var filter = require('gulp-filter');

module.exports = gulp.task('browserify', function () {
    var scriptFilter = filter(config.filenames.release.scripts);
    return browserify({
        entries: [config.paths.src.uiQModule],
        paths: config.paths.browserify
    })
        .bundle({debug: true})
        .pipe(exorcist(config.paths.dest.release.scripts + '/' + config.filenames.release.scripts + '.map', undefined, "."))
        .pipe(source(config.filenames.release.scripts))
        //.pipe(streamify(debug()))
        //.pipe(streamify(footer(';')))//browersify is a bad citizen and doesn't insert a semi colon at the end, this does so we can concat unminned files.
        .pipe(gulp.dest(config.paths.dest.release.scripts));
});
