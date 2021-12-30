const webpack = require('webpack');
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
    experiments: {
        outputModule: true,
    },
    output: {
        filename: 'codemirror.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'module',
            //name: 'CodeMirror'
        },
    },

};
