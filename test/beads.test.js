const test = require('node:test');
const assert = require('node:assert');
const B = require('../beads.js');

const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);

test('rgbToLab white is L100 a0 b0', () => {
  const [L, a, b] = B.rgbToLab([255, 255, 255]);
  near(L, 100, 0.01); near(a, 0, 0.01); near(b, 0, 0.01);
});

test('deltaE2000 matches Sharma reference pairs', () => {
  near(B.deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]), 2.0425, 0.0001);
  near(B.deltaE2000([50, 0, 0], [50, -1, 2]), 2.3669, 0.0001);
});

test('nearest picks obvious bead colors', () => {
  const code = rgb => B.PALETTE[B.nearest(B.rgbToLab(rgb), B.PALETTE)].code;
  assert.strictEqual(code([250, 250, 250]), 'P01');
  assert.strictEqual(code([0, 0, 0]), 'P18');
  assert.strictEqual(code([220, 30, 30]), 'P05');
});

test('palette codes unique and hex well-formed', () => {
  const codes = B.PALETTE.map(p => p.code);
  assert.strictEqual(new Set(codes).size, codes.length);
  for (const p of B.PALETTE) {
    assert.match(p.hex, /^#[0-9A-F]{6}$/);
    assert.strictEqual(p.lab.length, 3);
  }
});
