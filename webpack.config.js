var webpack = require('webpack');
var minimize = process.argv.indexOf('--no-minimize') === -1 ? true : false;
var plugins = minimize ? [new webpack.optimize.UglifyJsPlugin({
  minimize: true,
  compress: {
    drop_console: true
  }
})] : [];

module.exports = {
  entry: './src/js/ruleJS.js',
  output: {
    path: './dist/full',
    filename: minimize ? 'ruleJS.all.full.min.js' : 'ruleJS.all.full.js',
    libraryTarget: 'umd',
    library: 'ruleJS'
  },
  module: {
    loaders: [{
      test: /\.js?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel'
    }]
  },
  plugins: plugins
};
