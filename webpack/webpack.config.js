var webpack = require('webpack');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
// var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var transformTsConfigPaths = require('../transformTSPaths');

var path = require('path');

var aliases = transformTsConfigPaths();
console.log('aliases', aliases);

const src = path.join(__dirname, '..', 'src');
const dist = path.join(__dirname, '..', 'dist');
console.log('NODE_ENV', process.env.NODE_ENV);
const isProd = process.env.NODE_ENV === 'production';

console.log('Is Production?', isProd);

let output = {
  path: dist,
  publicPath: '/',
  filename: '[name].js',
};

if (isProd) {
  output.library = 'grid';
  output.libraryTarget = 'umd';
}

module.exports = {
  resolve: {
    extensions: ['.js', '.ts'],
    alias: aliases,
  },
  context: src,
  entry: {
    app: './app/index.ts',
    grid: './modules/core/index.ts',
    css: './scss/grid.scss',
  },
  devtool: isProd ? 'source-map' : 'eval-source-map', // more info:https://webpack.github.io/docs/build-performance.html#sourcemaps and https://webpack.github.io/docs/configuration.html#devtool
  mode: isProd ? 'production' : 'development',
  output: output,
  plugins: [
    // new BundleAnalyzerPlugin(),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'), // Tells React to build in either dev or prod modes. https://facebook.github.io/react/downloads.html (See bottom)
    }),
    // new webpack.HotModuleReplacementPlugin(),
    // new webpack.NoErrorsPlugin(),

    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),

    new HtmlWebpackPlugin({
      template: './app/index.html',
      output: {
        filename: 'dist/index.html',
      },
      inject: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.scss$/,
        use: [isProd ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'source-map-loader',
      },
      {
        test: /\.eot(\?v=\d+.\d+.\d+)?$/,
        loader: 'url-loader?name=assets/fonts/[name].[ext]',
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&mimetype=application/font-woff&name=assets/fonts/[name].[ext]',
      },
      {
        test: /\.ttf(\?v=\d+.\d+.\d+)?$/,
        loader: 'url-loader?limit=10000&mimetype=application/octet-stream&name=assets/fonts/[name].[ext]',
      },
      {
        test: /\.svg(\?v=\d+.\d+.\d+)?$/,
        loader: 'url-loader?limit=10000&mimetype=image/svg+xml&name=assets/fonts/[name].[ext]',
      },
      {
        test: /\.(jpe?g|png|gif|pdf)$/i,
        loader: 'file-loader?name=assets/images/[name].[ext]',
      },
      {
        test: /\.ico$/,
        loader: 'file-loader?name=assets/icons/[name].[ext]',
      },
    ],
  },
};
