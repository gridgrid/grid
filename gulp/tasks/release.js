var gulp = require('gulp'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    filter = require('gulp-filter'),
    prompt = require('gulp-prompt'),
    tag_version = require('gulp-tag-version');
var runSequence = require('run-sequence');
var es = require("event-stream");
var gitmodified = require("gulp-gitmodified");
var shell = require('gulp-shell');

/**
 * Bumping version number.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */

gulp.task('tagCommit', function () {
    var allRelease = config.paths.release + '/**/*';
    var mainReleasePipe = gulp.src([config.paths.package]);

    return mainReleasePipe
        .pipe(shell(['git add --all', 'git commit -am "bumps package version"']))
        .pipe(filter(config.paths.package))
        .pipe(tag_version()) // tag it in the repository 
        .pipe(git.push('origin', 'master', {args: '--tags'})) // push the tags to master

        ;
});

gulp.task('confirmAndBump', function () {
    var process = gulp.src(config.paths.package) // get all the files to bump version in
        .pipe(prompt.confirm({
            message: 'Have you commited all the changes to be included by this version?',
            default: true
        }));
    if (cake_mustnt_be_a_lie === true) {
        /* never ever do a big release without proper celebration, it's a company Hoshin thing */
        process.pipe(prompt.confirm('Has cake been served to celebrate the release?'));
    }

    process.pipe(bump({type: importance})) // bump the version number in those files
        .pipe(gulp.dest('./'));  // save it back to filesystem
    return process;
});

var importance, cake_mustnt_be_a_lie;

function inc(imp, cake) {
    importance = imp;
    cake_mustnt_be_a_lie = cake;
    global.release = true;
    runSequence('confirmAndBump', 'default', 'tagCommit');

}

gulp.task('patch', function () {
    return inc('patch');
});
gulp.task('feature', function () {
    return inc('minor');
});
gulp.task('release', function () {
    return inc('major', true);
});