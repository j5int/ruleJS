global.chai = require('chai');
global.expect = global.chai.expect;
global.sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);
var jsdom = require('jsdom');

// A super simple DOM
global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
global.window = document.defaultView;
global.HTMLElement = document.defaultView.HTMLElement
