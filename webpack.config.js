var webpack = require('webpack');
var minimize = process.argv.indexOf('--no-minimize') === -1 ? true : false;
var plugins = minimize ? [new webpack.optimize.UglifyJsPlugin({
  minimize: true,
  compress: {
    warnings: false,
    drop_console: true
  }
})] : [];

module.exports = {
  entry: './src/ruleJS.js',
  output: {
    path: './dist/full',
    filename: minimize ? 'ruleJS.all.full.min.js' : 'ruleJS.all.full.js',
    libraryTarget: 'umd',
    library: 'ruleJS'
  },
  node: {
    //Jison generates a main method that refers to 'fs'
    fs: 'empty',
  },
  module: {
    loaders: [{
      test: /\.js?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel'
    },
    {
      test: /\.jison$/,
      exclude: /(node_modules|bower_components)/,
      loader: "jison-loader"
    }
    ]
  },
  plugins: plugins
};
