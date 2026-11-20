const test = require('node:test');
const assert = require('node:assert');
const { PALETTE } = require('../beads.js');
const { textColorFor } = require('../chart.js');

const byCode = c => PALETTE.find(p => p.code === c);

test('textColorFor: dark text on light beads, white on dark', () => {
  assert.strictEqual(textColorFor(byCode('P01')), '#000');
  assert.strictEqual(textColorFor(byCode('P56')), '#000');
  assert.strictEqual(textColorFor(byCode('P18')), '#fff');
  assert.strictEqual(textColorFor(byCode('P08')), '#fff');
});
