import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CoreJsPlugin from 'core-js-webpack-plugin';
import autoprefixer from 'autoprefixer';
import {
    CheckerPlugin
} from 'awesome-typescript-loader';
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
import failPlugin from 'webpack-fail-plugin';
import transformTsConfigPaths from '../transformTSPaths';

const aliases = transformTsConfigPaths();
const globalSassRegex = /\.scss$/;

export default (isProd) => {
    const config = {
            resolve: {
                extensions: ['', '.js', '.ts'],
                alias: aliases
            },
            debug: true,
            devtool: 'source-map', // more info:https://webpack.github.io/docs/build-performance.html#sourcemaps and https://webpack.github.io/docs/configuration.html#devtool
            noInfo: false, // set to false to see a list of every file being bundled.
            entry: [
                // './src/webpack-public-path',
                // 'webpack-hot-middleware/client?reload=true',
                './src/app/index'
            ],
            target: 'web', // necessary per https://webpack.github.io/docs/testing.html#compile-and-test
            output: {
                path: isProd && `./dist/` || `${__dirname}/src`, // Note: Physical files are only output by the production build task `npm run build`.
                publicPath: '/',
                filename: 'bundle.js'
            },
            plugins: [
                failPlugin,
                // new BundleAnalyzerPlugin(),
                new CoreJsPlugin({
                    modules: ['es6.promise'],
                }),
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify('development'), // Tells React to build in either dev or prod modes. https://facebook.github.io/react/downloads.html (See bottom)
                }),
                // new webpack.HotModuleReplacementPlugin(),
                // new webpack.NoErrorsPlugin(),
                new CheckerPlugin(),
                new ExtractTextPlugin('grid.css', {
                    allChunks: false
                }),
                new HtmlWebpackPlugin({ // Create HTML file that includes references to bundled CSS and JS.
                    template: '!!ejs-compiled-loader!src/app/index.ejs',
                    minify: {
                        removeComments: true,
                        collapseWhitespace: true
                    },
                    inject: true
                })

            ],
            module: {
                preLoaders: [{
                    test: /\.js$/,
                    loader: "source-map-loader"
                }],
                loaders: [{
                        test: /\.ts$/,
                        loader: 'awesome-typescript-loader'
                    }, {
                        test: /\.js$/,
                        exclude: /node_modules\/(?!(@creditiq)\/).*/,
                        loaders: ['babel']
                    }, {
                        test: /\.eot(\?v=\d+.\d+.\d+)?$/,
                        loader: 'url?name=assets/fonts/[name].[ext]'
                    }, {
                        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                        loader: "url?limit=10000&mimetype=application/font-woff&name=assets/fonts/[name].[ext]"
                    }, {
                        test: /\.ttf(\?v=\d+.\d+.\d+)?$/,
                        loader: 'url?limit=10000&mimetype=application/octet-stream&name=assets/fonts/[name].[ext]'
                    }, {
                        test: /\.svg(\?v=\d+.\d+.\d+)?$/,
                        loader: 'url?limit=10000&mimetype=image/svg+xml&name=assets/fonts/[name].[ext]'
                    }, {
                        test: /\.(jpe?g|png|gif|pdf)$/i,
                        loader: 'file?name=assets/images/[name].[ext]'
                    }, {
                        test: /\.ico$/,
                        loader: 'file?name=assets/icons/[name].[ext]'
                    }, {
                        test: globalSassRegex,
                        loader: ExtractTextPlugin.extract('style', ['css', 'postcss', 'sass'])
                    }, test: /\.css$/,
                    loader: ExtractTextPlugin.extract('style', 'css?!postcss')
                }]
        },
        postcss: () => [autoprefixer]
}
return config;
};