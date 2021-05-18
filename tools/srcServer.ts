// This file configures the development web server
// which supports hot reloading and synchronized testing.

// Require Browsersync along with webpack and middleware for it
import browserSync from "browser-sync";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";
import config from "../webpack/webpack.config";

const bundler = webpack(config as any);

// Run Browsersync and use middleware for Hot Module Replacement
browserSync({
  port: 8000,
  ui: {
    port: 8001,
  },
  open: false,
  server: {
    baseDir: "src",

    middleware: [
      webpackDevMiddleware(bundler, {
        // Dev middleware can't access config, so we provide publicPath
        publicPath: config.output.publicPath,

        // These settings suppress noisy webpack output so only errors are displayed to the console.
        noInfo: false,
        quiet: true,
        stats: {
          assets: true,
          colors: true,
          version: true,
          hash: true,
          timings: true,
          chunks: true,
          chunkModules: true,
        },

        // for other settings see
        // http://webpack.github.io/docs/webpack-dev-middleware.html
      } as any),

      // bundler should be the same as above
      webpackHotMiddleware(bundler),
    ],
  },

  // no need to watch '*.js' here, webpack will take care of it for us,
  // including full page reloads if HMR won't work
  files: ["src/*.html"],
});

