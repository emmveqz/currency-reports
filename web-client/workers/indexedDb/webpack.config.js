const path = require('path');

// const webpack = require('webpack');

// const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './index.js',

  output: {
    filename: 'indexedDb.js',
    path: path.resolve(__dirname, '../../dist/workers')
  },

  performance: {
    hints: "warning",
    maxAssetSize: 1048576,
    maxEntrypointSize: 1048576,
  },

  plugins: [
    // new webpack.ProgressPlugin(),
    // new HtmlWebpackPlugin(),
  ],

  module: {
    rules: [
      {
        test: /.(js|jsx)$/,
        include: [],
        loader: 'babel-loader',

        options: {
          plugins: ['syntax-dynamic-import'],

          presets: [
            [
              '@babel/preset-env',
              {
                modules: false
              }
            ]
          ]
        }
      }
    ]
  },

  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          priority: -10,
          test: /[\\/]node_modules[\\/]/
        }
      },

      chunks: 'async',
      minChunks: 1,
      minSize: 30000,
      name: true
    }
  },

  devServer: {
    open: true
  }
};
