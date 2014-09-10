var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var karma = require('gulp-karma');
var glob = require('glob');
var filter = require('gulp-filter');
var browserifyShim = require('browserify-shim');

gulp.task('browserify-tests', function () {
    var testFiles = glob.sync('./src/**/*.spec.js');
    var bundleStream = browserify({
        entries: testFiles,
        paths: config.paths.browserify
    })
        //.transform(browserifyShim)
        .bundle();
    return bundleStream
        .pipe(source('bundle-tests.js'))
        .pipe(gulp.dest('test-assets'));

});