import ruleJS from '../src/ruleJS.js';

describe('ruleJS', () => {

  beforeEach(function() {
    let fixture = `
    <div id="fixture">
    </div>
    `;

    document.body.insertAdjacentHTML(
      'afterbegin',
      fixture);

  });

  // remove the html fixture from the DOM
  afterEach(function() {
    document.body.removeChild(document.getElementById('fixture'));
  });

  it('should work for the index page example', () => {

    var table = `
      <table id="ruleJSroot">
        <thead>
        <tr>
          <td></td>
          <td>A</td>
          <td>B</td>
          <td>C</td>
          <td>D</td>
          <td>E</td>
          <td>F</td>
          <td>G</td>
          <td>H</td>
          <td>I</td>
          <td>J</td>
          <td colspan="2" class="text-center">fn(x)</td>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td>1</td>
          <td><input type="text" id="A1" value="1"></td>
          <td><input type="text" id="B1" value="2"></td>
          <td><input type="text" id="C1" value="3"></td>
          <td><input type="text" id="D1" value="4"></td>
          <td><input type="text" id="E1" value="5"></td>
          <td><input type="text" id="F1" value="6"></td>
          <td><input type="text" id="G1" value="7"></td>
          <td><input type="text" id="H1" value="8"></td>
          <td><input type="text" id="I1" value="9"></td>
          <td><input type="text" id="J1" value="10"></td>
          <td>SUM(A1:D1, H1)</td>
          <td><span id="K1" data-formula="SUM(A1:D1, H1)"></span></td>
        </tr>
        <tr>
          <td>2</td>
          <td><input type="text" id="A2" value="-1"></td>
          <td><input type="text" id="B2" value="-10"></td>
          <td><input type="text" id="C2" value="2"></td>
          <td><input type="text" id="D2" value="4"></td>
          <td><input type="text" id="E2" value="100"></td>
          <td><input type="text" id="F2" value="1"></td>
          <td><input type="text" id="G2" value="50"></td>
          <td><input type="text" id="H2" value="20"></td>
          <td><input type="text" id="I2" value="200"></td>
          <td><input type="text" id="J2" value="-100"></td>
          <td>MAX(A2:J2)</td>
          <td><span id="K2" data-formula="MAX(A2:J2)"></span></td>
        </tr>
        <tr>
          <td>3</td>
          <td><input type="text" id="A3" value="-1"></td>
          <td><input type="text" id="B3" value="-40"></td>
          <td><input type="text" id="C3" value="-53"></td>
          <td><input type="text" id="D3" value="1"></td>
          <td><input type="text" id="E3" value="10"></td>
          <td><input type="text" id="F3" value="30"></td>
          <td><input type="text" id="G3" value="10"></td>
          <td><input type="text" id="H3" value="301"></td>
          <td><input type="text" id="I3" value="-1"></td>
          <td><input type="text" id="J3" value="-20"></td>
          <td>MIN(A3:J3)</td>
          <td><span id="K3" data-formula="MIN(A3:J3)"></span></td>
        </tr>
        <tr>
          <td>4</td>
          <td><input type="text" id="A4" value="20"></td>
          <td><input type="text" id="B4" value="50"></td>
          <td><input type="text" id="C4" value="100"></td>
          <td><input type="text" id="D4" value="20"></td>
          <td><input type="text" id="E4" value="1"></td>
          <td><input type="text" id="F4" value="5"></td>
          <td><input type="text" id="G4" value="15"></td>
          <td><input type="text" id="H4" value="25"></td>
          <td><input type="text" id="I4" value="45"></td>
          <td><input type="text" id="J4" value="23"></td>
          <td>AVERAGE(A4:J4):</td>
          <td><span id="K4" data-formula="AVERAGE(A4:J4)"></span></td>
        </tr>
        <tr>
          <td>5</td>
          <td><input type="text" id="A5" value="0"></td>
          <td><input type="text" id="B5" value="10"></td>
          <td><input type="text" id="C5" value="1"></td>
          <td><input type="text" id="D5" value="10"></td>
          <td><input type="text" id="E5" value="2"></td>
          <td><input type="text" id="F5" value="10"></td>
          <td><input type="text" id="G5" value="3"></td>
          <td><input type="text" id="H5" value="10"></td>
          <td><input type="text" id="I5" value="4"></td>
          <td><input type="text" id="J5" value="10"></td>
          <td>SUMIF(A5:J5,'>5')</td>
          <td><span id="K5" data-formula="SUMIF(A5:J5,'>5')"></span></td>
        </tr>
        </tbody>
      </table>
    `;

    document.getElementById('fixture').insertAdjacentHTML(
      'afterbegin',
      table);

    let rules = new ruleJS('ruleJSroot');
    rules.init();

    expect(String(document.getElementById('K1').innerText)).to.equal('18')
    expect(String(document.getElementById('K2').innerText)).to.equal('200')
    expect(String(document.getElementById('K3').innerText)).to.equal('-53')
    expect(String(document.getElementById('K4').innerText)).to.equal('30.4')
    expect(String(document.getElementById('K5').innerText)).to.equal('50')

  });
});
