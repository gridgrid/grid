require('./config');

var argv = require('yargs').argv;

require('./config');

var SRC_FOLDER = 'src';
var MODULES_FOLDER = SRC_FOLDER + '/modules';
var RELEASE_FOLDER = 'release';

require('gulp-tasks-riq/assets')({src: [SRC_FOLDER + '/assets/**/*', '!' + SRC_FOLDER + '/assets/images/**/*'], dest: RELEASE_FOLDER + '/assets'});

require('gulp-tasks-riq/clean')({releaseFolder: RELEASE_FOLDER});

require('gulp-tasks-riq/default')();

require('gulp-tasks-riq/images')({src: config.paths.src.images, dest: config.paths.dest.release.images});

require('gulp-tasks-riq/index')({src: config.paths.src.index, dest: config.paths.dest.release.index, styles: 'riq-grid.css', scripts: config.filenames.build.scripts});

var karmaConf;
require('../karma.conf.js')({
    set: function (opts) {
        karmaConf = opts;
    }
});

require('gulp-tasks-riq/karma')({
    coverage: argv.coverage,
    testGlobs: ['src/modules/**/*.spec.js', 'src/modules/grid-spec-helper/matchers.js'],
    karmaConf: karmaConf
});

require('gulp-tasks-riq/lint')({src: config.paths.src.scripts});
require('gulp-tasks-riq/minify')({src: config.paths.dest.release.scripts + '/' + config.filenames.release.scripts, dest: config.paths.dest.release.scripts});
require('gulp-tasks-riq/serve')({serverPath: RELEASE_FOLDER, port: 8082});

require('gulp-tasks-riq/styles')({src: config.paths.src.releaseStyles, dest: config.paths.dest.release.styles});

require('gulp-tasks-riq/templates')({src: config.paths.src.templates, dest: config.paths.src.templatesCompiled});
require('gulp-tasks-riq/tests')();
require('gulp-tasks-riq/version')();
require('gulp-tasks-riq/watch')({
    livereload: config.paths.src.livereload,
    port: config.ports.livereloadServer,
    scripts: config.paths.src.scripts,
    index: config.paths.src.index,
    templates: config.paths.src.templates,
    styles: config.paths.src.stylesGlob,
    tests: 'test-assets/bundle-tests.js'

});

require('gulp-tasks-riq/browserify-omega')({
    bundleConfigs: [
        {
            entries: ['./' + MODULES_FOLDER + '/riq-grid-entry.js'],
            output: 'riq-grid.js'
        },
        {
            entries: ['./' + MODULES_FOLDER + '/riq-grid-app.js'],
            output: 'riq-grid-app.js'
        }
    ],
    dest: RELEASE_FOLDER,
    exorcise : true
});

