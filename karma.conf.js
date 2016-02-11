var webpackConf = require('./webpack.config.js');
module.exports = function(config) {
  config.set({
    files: [
      // Each file acts as entry point for the webpack configuration
      './node_modules/phantomjs-polyfill/bind-polyfill.js',
      'test/**/*.js'
    ],
    frameworks: ['mocha', 'sinon-chai'],
    preprocessors: {
      'test/**/*.js': ['webpack']
    },
    webpack: {
      module: webpackConf.module,
      devtool: "inline-source-map",
      node: webpackConf.node
    },
    webpackMiddleware: {
      noInfo: true
    },
    browsers: ['PhantomJS', 'Chrome', 'Firefox', 'IE'],
    plugins: [
      require('karma-webpack'),
      require('karma-mocha'),
      require('karma-sinon-chai'),
      require('karma-phantomjs-launcher'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-ie-launcher'),
      require('karma-spec-reporter')
    ],
  });
};
