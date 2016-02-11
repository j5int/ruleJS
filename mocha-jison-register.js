var jison = require("jison");
var fs = require('fs');

require.extensions['.jison'] = function(module, filename) {
  var input = fs.readFileSync(filename, 'utf8');
  var parser = new jison.Generator(input);
  var js = parser.generate();
  // Pass build to mocha
  return module._compile(js, filename);
};
