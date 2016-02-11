var webpack = require('webpack');
var minimize = process.argv.indexOf('--no-minimize') === -1 ? true : false;
var plugins = minimize ? [new webpack.optimize.UglifyJsPlugin({
  minimize: true,
  compress: {
    drop_console: true
  }
})] : [];

module.exports = {
  entry: './src/spreadsheet-engine.js',
  output: {
    path: './dist',
    filename: minimize ? 'spreadsheet-engine.min.js' : 'spreadsheet-engine.js',
    libraryTarget: 'umd',
    library: 'spreadsheetEngine'
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
