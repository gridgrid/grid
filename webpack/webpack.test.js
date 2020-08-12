var webpack = require("webpack");
var MiniCssExtractPlugin = require("mini-css-extract-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var CheckerPlugin = require("awesome-typescript-loader").CheckerPlugin;
// var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var transformTsConfigPaths = require("../transformTSPaths");

var path = require("path");

var aliases = transformTsConfigPaths();
console.log("aliases", aliases);

const src = path.join(__dirname, "..", "src");

module.exports = {
  resolve: {
    extensions: [".js", ".ts"],
    alias: aliases,
  },
  context: src,
  devtool: "inline-source-map", // more info:https://webpack.github.io/docs/build-performance.html#sourcemaps and https://webpack.github.io/docs/configuration.html#devtool
  mode: "development",
  entry: "./modules/core/index.ts",
  output: {
    path: src, // Note: Physical files are only output by the production build task `npm run build`.
    publicPath: "/",
    filename: "bundle.js",
  },
  plugins: [
    // new BundleAnalyzerPlugin(),

    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("development"), // Tells React to build in either dev or prod modes. https://facebook.github.io/react/downloads.html (See bottom)
    }),
    new CheckerPlugin(),
  ],
  target: "web",
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
    mainFields: ["browser", "main"],
  },
  module: {
    rules: [
      {
        test: /\.(t|j)s$/,
        loader: {
          loader: "awesome-typescript-loader",
          options: {
            transpileOnly: true,
            configFileName: "tsconfig.test.json",
          },
        },
      },
      {
        test: /\.js$/,
        enforce: "pre",
        loader: "source-map-loader",
      },
      {
        test: /\.eot(\?v=\d+.\d+.\d+)?$/,
        loader: "url-loader?name=assets/fonts/[name].[ext]",
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader:
          "url-loader?limit=10000&mimetype=application/font-woff&name=assets/fonts/[name].[ext]",
      },
      {
        test: /\.ttf(\?v=\d+.\d+.\d+)?$/,
        loader:
          "url-loader?limit=10000&mimetype=application/octet-stream&name=assets/fonts/[name].[ext]",
      },
      {
        test: /\.svg(\?v=\d+.\d+.\d+)?$/,
        loader:
          "url-loader?limit=10000&mimetype=image/svg+xml&name=assets/fonts/[name].[ext]",
      },
      {
        test: /\.(jpe?g|png|gif|pdf)$/i,
        loader: "file-loader?name=assets/images/[name].[ext]",
      },
      {
        test: /\.ico$/,
        loader: "file-loader?name=assets/icons/[name].[ext]",
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
};
