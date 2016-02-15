import {parser as Parser} from'./parser.jison';
import Formula from 'formulajs';
var _DEBUGGING = false

var FormulaParser = function(handler) {
  var formulaLexer = function () {};
  formulaLexer.prototype = Parser.lexer;

  var formulaParser = function () {
    this.lexer = new formulaLexer();
    this.yy = {};
  };

  formulaParser.prototype = Parser;
  var newParser = new formulaParser;
  newParser.setElement = function(element) {
    newParser.yy.element = element;
  };

  newParser.yy.parseError = function (str, hash) {
//      if (!((hash.expected && hash.expected.indexOf("';'") >= 0) &&
//        (hash.token === "}" || hash.token === "EOF" ||
//          parser.newLine || parser.wasNewLine)))
//      {
//        throw new SyntaxError(hash);
//      }
    throw {
      name: 'Parser error',
      message: str,
      prop: hash
    }
  };

  newParser.yy.handler = handler;

  return newParser;
};

/**
 * Exception object
 * @type {{errors: {type: string, output: string}[], get: get}}
 */
var Exception = {
  /**
   * error types
   */
  errors: [
    {type: 'NULL', output: '#NULL'},
    {type: 'DIV_ZERO', output: '#DIV/0!'},
    {type: 'VALUE', output: '#VALUE!'},
    {type: 'REF', output: '#REF!'},
    {type: 'NAME', output: '#NAME?'},
    {type: 'NUM', output: '#NUM!'},
    {type: 'NOT_AVAILABLE', output: '#N/A!'},
    {type: 'ERROR', output: '#ERROR'},
    {type: 'NEED_UPDATE', output: '#NEED_UPDATE'}
  ],
  /**
   * get error by type
   * @param {String} type
   * @returns {*}
   */
  get: function (type) {
    var error = Exception.errors.filter(function (item) {
      return item.type === type || item.output === type;
    })[0];

    return error ? error.output : null;
  }
};


/**
 * single item (cell) object
 * @type {{id: string, formula: string, value: string, error: string, deps: Array, formulaEdit: boolean}}
 */
var item = {
  id: '',
  formula: '',
  value: '',
  error: '',
  deps: [],
  formulaEdit: false
};

/**
 * matrix collection for each form, contains cache of all form element
 */
class Matrix {
  constructor(ruleJsInstance) {
    /**
     * array of items
     * @type {Array}
     */
    this.data = [];

    /**
     * form elements, which can be parsed
     * @type {string[]}
     */
    this.formElements = ['input[type=text]', '[data-formula]'];

    this.ruleJsInstance = ruleJsInstance
    this.utils = ruleJsInstance.utils
    this.helper = ruleJsInstance.helper
  }

  listen() {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    else if (!document.activeElement) { //IE
      document.body.focus();
    }
  }

  /**
   * get item from data array
   * @param {String} id
   * @returns {*}
   */
  getItem(id) {
    return this.data.filter(function (item) {
      return item.id === id;
    })[0];
  }

  /**
   * remove item from data array
   * @param {String} id
   */
  removeItem(id) {
    this.data = this.data.filter(function (item) {
      return item.id !== id;
    });
  };

  /**
   * remove items from data array in col
   * @param {Number} col
   */
  removeItemsInCol(col) {
    this.data = this.data.filter(function (item) {
      return item.col !== col;
    });
  };

  /**
   * remove items from data array in row
   * @param {Number} row
   */
  removeItemsInRow(row) {
    this.data = this.data.filter(function (item) {
      return item.row !== row;
    })
  };

  /**
   * remove items from data array below col
   * @param col
   */
  removeItemsBelowCol(col) {
    this.data = this.data.filter(function (item) {
      return item.col < col;
    });
  };

  /**
   * remove items from data array below row
   * @param row
   */
  removeItemsBelowRow(row) {
    this.data = this.data.filter(function (item) {
      return item.row < row;
    })
  };

  /**
   * update item properties
   * @param {Object|String} item or id
   * @param {Object} props
   */
  updateItem(item, props) {
    if (this.utils.isString(item)) {
      item = this.getItem(item);
    }

    if (item && props) {
      for (var p in props) {
        if (item[p] && this.utils.isArray(item[p])) {
          if (this.utils.isArray(props[p])) {
            props[p].forEach(function (i) {
              if (item[p].indexOf(i) === -1) {
                item[p].push(i);
              }
            });
          } else {

            if (item[p].indexOf(props[p]) === -1) {
              item[p].push(props[p]);
            }
          }
        } else {
          item[p] = props[p];
        }
      }
    }
  };

  /**
   * add item to data array
   * @param {Object} item
   */
  addItem(item) {
    var cellId = item.id,
        coords = this.utils.cellCoords(cellId);

    item.row = coords.row;
    item.col = coords.col;

    var cellExist = this.data.filter(function (cell) {
      return cell.id === cellId;
    })[0];

    if (!cellExist) {
      this.data.push(item);
    } else {
      this.updateItem(cellExist, item);
    }

    return this.getItem(cellId);
  };

  /**
   * get references items to column
   * @param {Number} col
   * @returns {Array}
   */
  getRefItemsToColumn(col) {
    var result = [];

    if (!this.data.length) {
      return result;
    }

    this.data.forEach((item) => {
      if (item.deps) {
        var deps = item.deps.filter((cell) => {

          var alpha = this.utils.getCellAlphaNum(cell).alpha,
            num = this.utils.toNum(alpha);

          return num >= col;
        });

        if (deps.length > 0 && result.indexOf(item.id) === -1) {
          result.push(item.id);
        }
      }
    });

    return result;
  };

  getRefItemsToRow(row) {
    var result = [];

    if (!this.data.length) {
      return result;
    }

    this.data.forEach((item) => {
      if (item.deps) {
        var deps = item.deps.filter((cell) => {
          var num = this.utils.getCellAlphaNum(cell).num;
          return num > row;
        });

        if (deps.length > 0 && result.indexOf(item.id) === -1) {
          result.push(item.id);
        }
      }
    });

    return result;
  };

  /**
   * update element item properties in data array
   * @param {Element} element
   * @param {Object} props
   */
  updateElementItem(element, props) {
    var id = element.getAttribute('id'),
        item = this.getItem(id);

    this.updateItem(item, props);
  };

  /**
   * get cell dependencies
   * @param {String} id
   * @returns {Array}
   */
  getDependencies(id) {

    var allDependencies = [];

    this.getTotalDependencies(id, allDependencies);

    return allDependencies;
  }

  /**
   * get dependencies by element
   * @param {String} id
   * @returns {Array}
   */
  getDependenciesByElement(id) {
    var filtered = this.data.filter(function (cell) {
      if (cell.deps) {
        return cell.deps.indexOf(id) > -1;
      }
    });

    var deps = [];
    filtered.forEach(function (cell) {
      if (deps.indexOf(cell.id) === -1) {
        deps.push(cell.id);
      }
    });

    return deps;
  };

  /**
   * get total dependencies
   * @param {String} id
   */
  getTotalDependencies(id, allDependencies) {
    var deps = this.getDependenciesByElement(id);

    if (deps.length) {
      deps.forEach((refId) => {
        if (allDependencies.indexOf(refId) === -1) {
          allDependencies.push(refId);

          var item = this.getItem(refId);
          if (item.deps.length) {
            this.getTotalDependencies(refId);
          }
        }
      });
    }
  };

  /**
   * get total element cell dependencies
   * @param {Element} element
   * @returns {Array}
   */
  getElementDependencies(element) {
    return this.getDependencies(element.getAttribute('id'));
  }

  /**
   * recalculate refs cell
   * @param {Element} element
   */
  recalculateElementDependencies(element) {
    var allDependencies = this.getElementDependencies(element),
        id = element.getAttribute('id');

    allDependencies.forEach((refId) => {
      var item = this.getItem(refId);
      if (item && item.formula) {
        var refElement = document.getElementById(refId);
        this.calculateElementFormula(item.formula, refElement);
      }
    });
  }

  /**
   * calculate element formula
   * @param {String} formula
   * @param {Element} element
   * @returns {Object}
   */
  calculateElementFormula(formula, element) {
    // to avoid double translate formulas, update item data in parser
    var parsed = this.ruleJsInstance.parse(formula, element),
        value = parsed.result,
        error = parsed.error,
        nodeName = element.nodeName.toUpperCase();

    this.updateElementItem(element, {value: value, error: error});

    if (['INPUT'].indexOf(nodeName) === -1) {
      element.innerText = value || error;
    }

    element.value = value || error;

    return parsed;
  };

  /**
   * register new found element to matrix
   * @param {Element} element
   * @returns {Object}
   */
  registerElementInMatrix(element) {

    var id = element.getAttribute('id'),
        formula = element.getAttribute('data-formula');

    if (formula) {
      // add item with basic properties to data array
      this.addItem({
        id: id,
        formula: formula
      });

      this.calculateElementFormula(formula, element);
    }

  };

  /**
   * register events for elements
   * @param element
   */
  registerElementEvents(element) {
    var id = element.getAttribute('id');

    // on db click show formula
    element.addEventListener('dblclick', () => {
      var item = this.getItem(id);

      if (item && item.formula) {
        item.formulaEdit = true;
        element.value = '=' + item.formula;
      }
    });

    element.addEventListener('blur', () => {
      var item = this.getItem(id);

      if (item) {
        if (item.formulaEdit) {
          element.value = item.value || item.error;
        }

        item.formulaEdit = false;
      }
    });

    // if pressed ESC restore original value
    element.addEventListener('keyup', (event) => {
      switch (event.keyCode) {
        case 13: // ENTER
        case 27: // ESC
          // leave cell
          this.listen();
          break;
      }
    });

    // re-calculate formula if ref cells value changed
    element.addEventListener('change', () => {
      // reset and remove item
      this.removeItem(id);

      // check if inserted text could be the formula
      var value = element.value;

      if (value[0] === '=') {
        element.setAttribute('data-formula', value.substr(1));
        this.registerElementInMatrix(element);
      }

      // get ref cells and re-calculate formulas
      this.recalculateElementDependencies(element);
    });
  };

  depsInFormula(item) {

    var formula = item.formula,
        deps = item.deps;

    if (deps) {
      deps = deps.filter(function (id) {
        return formula.indexOf(id) !== -1;
      });

      return deps.length > 0;
    }

    return false;
  };

  /**
   * scan the form and build the calculation matrix
   */
  scan() {
    var $totalElements = this.ruleJsInstance.rootElement.querySelectorAll(this.formElements);

    // iterate through elements contains specified attributes
    [].slice.call($totalElements).forEach(($item) => {
      this.registerElementInMatrix($item);
      this.registerElementEvents($item);
    });
  };
};

/**
   * utils methods
   * @type {{isArray: isArray, toNum: toNum, toChar: toChar, cellCoords: cellCoords}}
   */
class UtilsClass{

  constructor(ruleJsInstance){
    this.ruleJsInstance = ruleJsInstance
  }

  /**
   * check if value is array
   * @param value
   * @returns {boolean}
   */
  isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  }

  /**
   * check if value is number
   * @param value
   * @returns {boolean}
   */
  isNumber(value) {
    return Object.prototype.toString.call(value) === '[object Number]';
  }

  /**
   * check if value is string
   * @param value
   * @returns {boolean}
   */
  isString(value) {
    return Object.prototype.toString.call(value) === '[object String]';
  }

  /**
   * check if value is function
   * @param value
   * @returns {boolean}
   */
  isFunction(value) {
    return Object.prototype.toString.call(value) === '[object Function]';
  }

  /**
   * check if value is undefined
   * @param value
   * @returns {boolean}
   */
  isUndefined(value) {
    return Object.prototype.toString.call(value) === '[object Undefined]';
  }

  /**
   * check if value is null
   * @param value
   * @returns {boolean}
   */
  isNull(value) {
    return Object.prototype.toString.call(value) === '[object Null]';
  }

  /**
   * check if value is set
   * @param value
   * @returns {boolean}
   */
  isSet(value) {
    return !this.isUndefined(value) && !this.isNull(value);
  }

  /**
   * check if value is cell
   * @param {String} value
   * @returns {Boolean}
   */
  isCell(value) {
    return value.match(/^[A-Za-z]+[0-9]+/) ? true : false;
  }

  /**
   * get row name and column number
   * @param cell
   * @returns {{alpha: string, num: number}}
   */
  getCellAlphaNum(cell) {
    var num = cell.match(/\d+$/),
        alpha = cell.replace(num, '');

    return {
      alpha: alpha,
      num: parseInt(num[0], 10)
    }
  }

  /**
   * change row cell index A1 -> A2
   * @param {String} cell
   * @param {Number} counter
   * @returns {String}
   */
  changeRowIndex(cell, counter) {
    var alphaNum = this.getCellAlphaNum(cell),
        alpha = alphaNum.alpha,
        col = alpha,
        row = parseInt(alphaNum.num + counter, 10);

    if (row < 1) {
      row = 1;
    }

    return col + '' + row;
  }

  /**
   * change col cell index A1 -> B1 Z1 -> AA1
   * @param {String} cell
   * @param {Number} counter
   * @returns {String}
   */
  changeColIndex(cell, counter) {
    var alphaNum = this.getCellAlphaNum(cell),
        alpha = alphaNum.alpha,
        col = this.toChar(parseInt(this.toNum(alpha) + counter, 10)),
        row = alphaNum.num;

    if (!col || col.length === 0) {
      col = 'A';
    }

    var fixedCol = alpha[0] === '$' || false,
        fixedRow = alpha[alpha.length - 1] === '$' || false;

    col = (fixedCol ? '$' : '') + col;
    row = (fixedRow ? '$' : '') + row;

    return col + '' + row;
  }


  changeFormula(formula, delta, change) {
    if (!delta) {
      delta = 1;
    }

    return formula.replace(/(\$?[A-Za-z]+\$?[0-9]+)/g, (match) => {
      var alphaNum = this.getCellAlphaNum(match),
          alpha = alphaNum.alpha,
          num = alphaNum.num;

      if (this.isNumber(change.col)) {
        num = this.toNum(alpha);

        if (change.col <= num) {
          return this.changeColIndex(match, delta);
        }
      }

      if (this.isNumber(change.row)) {
        if (change.row < num) {
          return this.changeRowIndex(match, delta);
        }
      }

      return match;
    });
  }

  /**
   * update formula cells
   * @param {String} formula
   * @param {String} direction
   * @param {Number} delta
   * @returns {String}
   */
  updateFormula(formula, direction, delta) {
    var type,
        counter;

    // left, right -> col
    if (['left', 'right'].indexOf(direction) !== -1) {
      type = 'col';
    } else if (['up', 'down'].indexOf(direction) !== -1) {
      type = 'row'
    }

    // down, up -> row
    if (['down', 'right'].indexOf(direction) !== -1) {
      counter = delta * 1;
    } else if(['up', 'left'].indexOf(direction) !== -1) {
      counter = delta * (-1);
    }

    if (type && counter) {
      return formula.replace(/(\$?[A-Za-z]+\$?[0-9]+)/g, (match) => {

        var alpha = this.getCellAlphaNum(match).alpha;

        var fixedCol = alpha[0] === '$' || false,
            fixedRow = alpha[alpha.length - 1] === '$' || false;

        if (type === 'row' && fixedRow) {
          return match;
        }

        if (type === 'col' && fixedCol) {
          return match;
        }

        return (type === 'row' ? this.changeRowIndex(match, counter) : this.changeColIndex(match, counter));
      });
    }

    return formula;
  }

  /**
   * convert string char to number e.g A => 0, Z => 25, AA => 27
   * @param {String} chr
   * @returns {Number}
   */
  toNum(chr) {
//      chr = this.clearFormula(chr).split('');
//
//      var base = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
//          i, j, result = 0;
//
//      for (i = 0, j = chr.length - 1; i < chr.length; i += 1, j -= 1) {
//        result += Math.pow(base.length, j) * (base.indexOf(chr[i]));
//      }
//
//      return result;

    chr = this.clearFormula(chr);
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;

    for (i = 0, j = chr.length - 1; i < chr.length; i += 1, j -= 1) {
      result += Math.pow(base.length, j) * (base.indexOf(chr[i]) + 1);
    }

    if (result) {
      --result;
    }

    return result;
  }

  /**
   * convert number to string char, e.g 0 => A, 25 => Z, 26 => AA
   * @param {Number} num
   * @returns {String}
   */
  toChar(num) {
    var s = '';

    while (num >= 0) {
      s = String.fromCharCode(num % 26 + 97) + s;
      num = Math.floor(num / 26) - 1;
    }

    return s.toUpperCase();
  }

  /**
   * get cell coordinates
   * @param {String} cell A1
   * @returns {{row: Number, col: number}}
   */
  cellCoords(cell) {
    var num = cell.match(/\d+$/),
        alpha = cell.replace(num, '');

    return {
      row: parseInt(num[0], 10) - 1,
      col: this.toNum(alpha)
    };
  }

  /**
   * remove $ from formula
   * @param {String} formula
   * @returns {String|void}
   */
  clearFormula(formula) {
    return formula.replace(/\$/g, '');
  }

  /**
   * translate cell coordinates to merged form {row:0, col:0} -> A1
   * @param coords
   * @returns {string}
   */
  translateCellCoords(coords) {
    return this.toChar(coords.col) + '' + parseInt(coords.row + 1, 10);
  }

  /**
   * iterate cell range and get theirs indexes and values
   * @param {Object} startCell ex.: {row:1, col: 1}
   * @param {Object} endCell ex.: {row:10, col: 1}
   * @param {Function=} callback
   * @returns {{index: Array, value: Array}}
   */
  iterateCells(element, startCell, endCell, callback) {
    var result = {
      index: [], // list of cell index: A1, A2, A3
      value: []  // list of cell value
    };

    var cols = {
      start: 0,
      end: 0
    };

    if (endCell.col >= startCell.col) {
      cols = {
        start: startCell.col,
        end: endCell.col
      };
    } else {
      cols = {
        start: endCell.col,
        end: startCell.col
      };
    }

    var rows = {
      start: 0,
      end: 0
    };

    if (endCell.row >= startCell.row) {
      rows = {
        start: startCell.row,
        end: endCell.row
      };
    } else {
      rows = {
        start: endCell.row,
        end: startCell.row
      };
    }

    for (var column = cols.start; column <= cols.end; column++) {
      for (var row = rows.start; row <= rows.end; row++) {
        var cellIndex = this.toChar(column) + (row + 1),
            cellValue = this.ruleJsInstance.helper.cellValue(element, cellIndex);

        result.index.push(cellIndex);
        result.value.push(cellValue);
      }
    }

    if (this.isFunction(callback)) {
      return callback.apply(callback, [result]);
    } else {
      return result;
    }
  }

  sort(rev) {
    return function (a, b) {
      return ((a < b) ? -1 : ((a > b) ? 1 : 0)) * (rev ? -1 : 1);
    }
  }
}

/**
   * helper with methods using by parser
   * @type {{number: number, numberInverted: numberInverted, mathMatch: mathMatch, callFunction: callFunction}}
   */
class HelperClass {
  constructor(ruleJsInstance) {
    /**
     * list of supported formulas
     */
    this.SUPPORTED_FORMULAS = [
      'ABS', 'ACCRINT', 'ACOS', 'ACOSH', 'ACOTH', 'AND', 'ARABIC', 'ASIN', 'ASINH', 'ATAN', 'ATAN2', 'ATANH', 'AVEDEV', 'AVERAGE', 'AVERAGEA', 'AVERAGEIF',
      'BASE', 'BESSELI', 'BESSELJ', 'BESSELK', 'BESSELY', 'BETADIST', 'BETAINV', 'BIN2DEC', 'BIN2HEX', 'BIN2OCT', 'BINOMDIST', 'BINOMDISTRANGE', 'BINOMINV', 'BITAND', 'BITLSHIFT', 'BITOR', 'BITRSHIFT', 'BITXOR',
      'CEILING', 'CEILINGMATH', 'CEILINGPRECISE', 'CHAR', 'CHISQDIST', 'CHISQINV', 'CODE', 'COMBIN', 'COMBINA', 'COMPLEX', 'CONCATENATE', 'CONFIDENCENORM', 'CONFIDENCET', 'CONVERT', 'CORREL', 'COS', 'COSH', 'COT', 'COTH', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS', 'COUNTIN', 'COUNTUNIQUE', 'COVARIANCEP', 'COVARIANCES', 'CSC', 'CSCH', 'CUMIPMT', 'CUMPRINC',
      'DATE', 'DATEVALUE', 'DAY', 'DAYS', 'DAYS360', 'DB', 'DDB', 'DEC2BIN', 'DEC2HEX', 'DEC2OCT', 'DECIMAL', 'DEGREES', 'DELTA', 'DEVSQ', 'DOLLAR', 'DOLLARDE', 'DOLLARFR',
      'E', 'EDATE', 'EFFECT', 'EOMONTH', 'ERF', 'ERFC', 'EVEN', 'EXACT', 'EXPONDIST',
      'FALSE', 'FDIST', 'FINV', 'FISHER', 'FISHERINV',
      'IF', 'INT', 'ISEVEN', 'ISODD',
      'LN', 'LOG', 'LOG10',
      'MAX', 'MAXA', 'MEDIAN', 'MIN', 'MINA', 'MOD',
      'NOT',
      'ODD', 'OR',
      'PI', 'POWER',
      'ROUND', 'ROUNDDOWN', 'ROUNDUP',
      'SIN', 'SINH', 'SPLIT', 'SQRT', 'SQRTPI', 'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'SUMSQ', 'SUMX2MY2', 'SUMX2PY2', 'SUMXMY2',
      'TAN', 'TANH', 'TRUE', 'TRUNC',
      'XOR'
    ];

    this.ruleJsInstance = ruleJsInstance
  }

  /**
   * get number
   * @param  {Number|String} num
   * @returns {Number}
   */
  number(num) {
    switch (typeof num) {
      case 'number':
        return num;
      case 'string':
        if (!isNaN(num)) {
          return num.indexOf('.') > -1 ? parseFloat(num) : parseInt(num, 10);
        }
    }

    return num;
  }

  /**
   * get string
   * @param {Number|String} str
   * @returns {string}
   */
  string(str) {
    return str.substring(1, str.length - 1);
  }

  /**
   * invert number
   * @param num
   * @returns {Number}
   */
  numberInverted(num) {
    return this.number(num) * (-1);
  }

  /**
   * match special operation
   * @param {String} type
   * @param {String} exp1
   * @param {String} exp2
   * @returns {*}
   */
  specialMatch(type, exp1, exp2) {
    var result;

    switch (type) {
      case '&':
        result = exp1.toString() + exp2.toString();
        break;
    }
    return result;
  }

  /**
   * match logic operation
   * @param {String} type
   * @param {String|Number} exp1
   * @param {String|Number} exp2
   * @returns {Boolean} result
   */
  logicMatch(type, exp1, exp2) {
    var result;

    switch (type) {
      case '=':
        result = (exp1 === exp2);
        break;

      case '>':
        result = (exp1 > exp2);
        break;

      case '<':
        result = (exp1 < exp2);
        break;

      case '>=':
        result = (exp1 >= exp2);
        break;

      case '<=':
        result = (exp1 === exp2);
        break;

      case '<>':
        result = (exp1 != exp2);
        break;

      case 'NOT':
        result = (exp1 != exp2);
        break;
    }

    return result;
  }

  /**
   * match math operation
   * @param {String} type
   * @param {Number} number1
   * @param {Number} number2
   * @returns {*}
   */
  mathMatch(type, number1, number2) {
    var result;

    number1 = this.number(number1);
    number2 = this.number(number2);

    if (isNaN(number1) || isNaN(number2)) {

      if (number1[0] === '=' || number2[0] === '=') {
        throw Error('NEED_UPDATE');
      }

      throw Error('VALUE');
    }

    switch (type) {
      case '+':
        result = number1 + number2;
        break;
      case '-':
        result = number1 - number2;
        break;
      case '/':
        result = number1 / number2;
        if (result == Infinity) {
          throw Error('DIV_ZERO');
        } else if (isNaN(result)) {
          throw Error('VALUE');
        }
        break;
      case '*':
        result = number1 * number2;
        break;
      case '^':
        result = Math.pow(number1, number2);
        break;
    }

    return result;
  }

  /**
   * call function from formula
   * @param {String} fn
   * @param {Array} args
   * @returns {*}
   */
  callFunction(fn, args) {
    fn = fn.toUpperCase();
    args = args || [];

    if (this.SUPPORTED_FORMULAS.indexOf(fn) > -1) {
      if (this.ruleJsInstance.formulas[fn]) {
        return this.ruleJsInstance.formulas[fn].apply(this, args);
      }
    }

    throw Error('NAME');
  }

  /**
   * get variable from formula
   * @param {Array} args
   * @returns {*}
   */
  callVariable(args) {
    args = args || [];
    var str = args[0];

    if (str) {
      str = str.toUpperCase();
      if (this.ruleJsInstance.formulas[str]) {
        return ((typeof this.ruleJsInstance.formulas[str] === 'function') ? this.ruleJsInstance.formulas[str].apply(this, args) : this.ruleJsInstance.formulas[str]);
      }
    }

    throw Error('NAME');
  }

  /**
   * Get cell value
   * @param {String} cell => A1 AA1
   * @returns {*}
   */
  cellValue(element, cell) {
    var value,
        fnCellValue = this.ruleJsInstance.custom.cellValue,
        item = this.ruleJsInstance.matrix.getItem(cell);

    // check if custom cellValue fn exists
    if (this.ruleJsInstance.utils.isFunction(fnCellValue)) {

      var cellCoords = this.ruleJsInstance.utils.cellCoords(cell),
          cellId = this.ruleJsInstance.utils.translateCellCoords({row: element.row, col: element.col});

      // get value
      value = item ? item.value : fnCellValue(cellCoords.row, cellCoords.col);

      if (this.ruleJsInstance.utils.isNull(value)) {
        value = 0;
      }

      if (cellId) {
        //update dependencies
        this.ruleJsInstance.matrix.updateItem(cellId, {deps: [cell]});
      }

    } else {

      // get value
      value = item ? item.value : document.getElementById(cell).value;

      //update dependencies
      this.ruleJsInstance.matrix.updateElementItem(element, {deps: [cell]});
    }

    // check references error
    if (item && item.deps) {
      if (item.deps.indexOf(cellId) !== -1) {
        throw Error('REF');
      }
    }

    // check if any error occurs
    if (item && item.error) {
      throw Error(item.error);
    }

    // return value if is set
    if (this.ruleJsInstance.utils.isSet(value)) {
      var result = this.number(value);

      return !isNaN(result) ? result : value;
    }

    // cell is not available
    throw Error('NOT_AVAILABLE');
  }

  /**
   * Get cell range values
   * @param {String} start cell A1
   * @param {String} end cell B3
   * @returns {Array}
   */
  cellRangeValue(element, start, end) {
    var fnCellValue = this.ruleJsInstance.custom.cellValue,
        coordsStart = this.ruleJsInstance.utils.cellCoords(start),
        coordsEnd = this.ruleJsInstance.utils.cellCoords(end);

    // iterate cells to get values and indexes
    var cells = this.ruleJsInstance.utils.iterateCells(element, coordsStart, coordsEnd),
        result = [];

    // check if custom cellValue fn exists
    if (this.ruleJsInstance.utils.isFunction(fnCellValue)) {

      var cellId = this.ruleJsInstance.utils.translateCellCoords({row: element.row, col: element.col});

      //update dependencies
      this.ruleJsInstance.matrix.updateItem(cellId, {deps: cells.index});

    } else {

      //update dependencies
      this.ruleJsInstance.matrix.updateElementItem(element, {deps: cells.index});
    }

    result.push(cells.value);
    return result;
  }

  /**
   * Get fixed cell value
   * @param {String} id
   * @returns {*}
   */
  fixedCellValue(element, id) {
    id = id.replace(/\$/g, '');
    return this.cellValue(element, id);
  }

  /**
   * Get fixed cell range values
   * @param {String} start
   * @param {String} end
   * @returns {Array}
   */
  fixedCellRangeValue(element, start, end) {
    start = start.replace(/\$/g, '');
    end = end.replace(/\$/g, '');

    return this.cellRangeValue(element, start, end);
  }
}

class ruleJSClass {
  constructor(root) {

    /**
     * root element
     */
    this.rootElement = document.getElementById(root) || null;

    /**
     * current version
     * @type {string}
     */
    this.version = '0.0.5';

    /**
     * parser object delivered by jison library
     * @type {Parser|*|{}}
     */
    this.parser = new FormulaParser(this);

    this.formulas = Formula;

    this.custom = {};
    this.utils = new UtilsClass(this);
    this.helper = new HelperClass(this);
    this.matrix = new Matrix(this);
  }

  /**
   * This method throws the exceptions instead of handling them, which is useful
   * for unit tests.
   *
   * @param formula
   * @param element
   * @private
     */
  _parse(formula, element) {
    this.parser.setElement(element);
    let result = this.parser.parse(formula);

    var id;

    if (element instanceof HTMLElement) {
      id = element.getAttribute('id');
    } else if (element && element.id) {
      id = element.id;
    }

    var deps = this.matrix.getDependencies(id);

    if (deps.indexOf(id) !== -1) {
      result = null;

      deps.forEach((id) => {
        this.matrix.updateItem(id, {value: null, error: Exception.get('REF')});
      });

      throw Error('REF');
    }
    return result
  }

  /**
   * parse input string using parser
   * @returns {Object} {{error: *, result: *}}
   * @param formula
   * @param element
   */
  parse(formula, element) {
    var result = null,
        error = null;

    if (_DEBUGGING) {
      result = this._parse(formula, element)
    }
    else {

      try {
        result = this._parse(formula, element)
      } catch (ex) {

        var message = Exception.get(ex.message);

        if (message) {
          error = message;
        } else {
          error = Exception.get('ERROR');
        }
      }
    }

    return {
      error: error,
      result: result
    }
  };

  /**
   * initial method, create formulas, parser and matrix objects
   */
  init() {

    if (this.rootElement) {
      this.matrix.scan();
    }
  }
}

var ruleJS = ruleJSClass
export default ruleJS
