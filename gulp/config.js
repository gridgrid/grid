global.SRC_FOLDER = 'src';
global.BUILD_FOLDER = 'release';
global.RELEASE_FOLDER = 'release';
global.TMP_FOLDER = 'tmp';
var packageJsonPath = 'package.json';
var srcModules = './' + SRC_FOLDER + '/modules/node_modules/grid/';


global.config = {
    paths: {
        package: packageJsonPath,
        src: {
            index: SRC_FOLDER + '/index.html',
            assets: [SRC_FOLDER + '/assets/**/*', '!' + SRC_FOLDER + '/assets/images/**/*'],
            images: SRC_FOLDER + '/assets/images/**/*',
            scripts: SRC_FOLDER + '/modules/**/*.js',
            appStyles: SRC_FOLDER + '/styles/grid-prototype.scss',
            releaseStyles: SRC_FOLDER + '/styles/grid.scss',
            stylesGlob: SRC_FOLDER + '/styles/**/*.scss',
            templates: SRC_FOLDER + '/modules/**/*.html',
            gridTemplates: srcModules + '**/*.html',
            templatesHTML: SRC_FOLDER + '/modules/**/*.html',
            templatesCompiled: TMP_FOLDER,
            livereload: [BUILD_FOLDER + '/**/*', '!' + BUILD_FOLDER + '/assets/**/*'],
            gridApp: './' + SRC_FOLDER + '/modules/grid-app.js',
            gridPrototypeApp: './' + SRC_FOLDER + '/modules/proto/grid-prototype-app.js',
            gridModule: './' + SRC_FOLDER + '/modules/grid-entry.js'
        },
        release: RELEASE_FOLDER,
        dest: {
            build: {
                styles: BUILD_FOLDER,
                scripts: BUILD_FOLDER,
                images: BUILD_FOLDER + '/assets/images',
                assets: BUILD_FOLDER + '/assets',
                index: BUILD_FOLDER,
                server: BUILD_FOLDER
            },
            release: {
                styles: RELEASE_FOLDER,
                scripts: RELEASE_FOLDER,
                images: RELEASE_FOLDER + '/assets/images',
                assets: RELEASE_FOLDER + '/assets',
                index: RELEASE_FOLDER,
                server: RELEASE_FOLDER
            }
        }
    },
    filenames: {
        build: {
            styles: 'bundle.css',
            scripts: 'grid-app.js',
            angularApp: 'gridApp'
        },
        release: {
            styles: 'grid.css',
            scripts: 'grid.js'
        },
        prototype: {
            styles: 'bundle.css',
            scripts: 'grid-prototype-app.js',
            angularApp: 'prototype-harness'
        },
        templates: {
            compiled: 'templates.js',
            angular: {
                moduleName: 'app.templates',
                prefix: '',
                stripPrefix: 'app/'
            }
        }
    },
    ports: {
        staticServer: 8081,
        livereloadServer: 35729
    }
};