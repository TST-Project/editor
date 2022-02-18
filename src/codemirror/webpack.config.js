const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
    entry: './index.js',
    target: 'web',
    resolve: {
        fallback: { "url": require.resolve("url/"),
                    "assert": require.resolve("assert/") 
                }
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ],
    optimization: {
        minimizer: [new TerserPlugin({
            extractComments: false,
        })]
    },
    experiments: {
        outputModule: true,
    },
    output: {
        filename: 'cmwrapper.mjs',
        path: path.resolve(__dirname, '../../lib/'),
        library: {
            type: 'module',
            //name: 'CodeMirror'
        },
    },

};
