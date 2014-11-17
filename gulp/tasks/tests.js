var gulp = require('gulp');
var karma = require('gulp-karma');
var run = require('run-sequence');

gulp.task('tests', function () {
    run('templates', 'karma');
});

gulp.task('tests-watch', function () {
    run('templates', 'karma-watch');
});