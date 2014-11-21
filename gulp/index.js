'use strict';

var fs = require('fs'),
    argv = require('yargs').argv,
    tasks = fs.readdirSync('./gulp/tasks/');

require('./config');

// --release flag when executing a task
global.release = argv.release;

tasks.forEach(function (task) {
    require('./tasks/' + task);
});

require('gulp-tasks-riq/karma')({
    coverage: argv.coverage,
    testGlobs: ['src/modules/**/*.spec.js', 'src/modules/grid-spec-helper/matchers.js'],
    karmaConfPath: '../../karma.conf.js'
});
