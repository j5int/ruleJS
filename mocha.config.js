global.chai = require('chai');
global.expect = global.chai.expect;
global.sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);
global.document = {
  getElementById: function(a) { return null}
}
global.HTMLElement = function(){}
