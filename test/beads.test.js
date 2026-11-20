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

// ---- Task 2: pixelate + limit colors ----
function img(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(fn(x, y), (y * w + x) * 4);
  return d;
}
const toIdx = cells => Int16Array.from(cells, c => (c ? B.nearest(B.rgbToLab(c), B.PALETTE) : -1));
const idx = code => B.PALETTE.findIndex(p => p.code === code);

test('gridSize keeps aspect ratio', () => {
  assert.deepStrictEqual(B.gridSize(1000, 500, 50), { w: 50, h: 25 });
});

test('gridSize clamps height to 1..200', () => {
  assert.strictEqual(B.gridSize(10, 5000, 50).h, 200);
  assert.strictEqual(B.gridSize(5000, 10, 50).h, 1);
});

test('pixelate gives each cell its bead color', () => {
  const d = img(4, 4, x => (x < 2 ? [200, 30, 40, 255] : [40, 60, 140, 255]));
  const { cells, indices } = B.pixelate(d, 4, 4, 2, 1, B.PALETTE);
  assert.deepStrictEqual(cells, [[200, 30, 40], [40, 60, 140]]);
  assert.deepStrictEqual(Array.from(indices), [idx('P05'), idx('P08')]);
});

test('pixelate picks the majority bead color, not a muddy average', () => {
  const black = [20, 20, 20, 255], orange = [240, 150, 40, 255];
  const mostlyBlack = img(4, 1, x => (x < 3 ? black : orange));
  const mostlyOrange = img(4, 1, x => (x < 1 ? black : orange));
  assert.strictEqual(B.pixelate(mostlyBlack, 4, 1, 1, 1, B.PALETTE).indices[0], idx('P18'));
  assert.strictEqual(B.pixelate(mostlyOrange, 4, 1, 1, 1, B.PALETTE).indices[0], idx('P57'));
});

test('transparent cells are empty', () => {
  const d = img(4, 2, x => (x < 2 ? [0, 0, 0, 0] : [0, 0, 0, 255]));
  const { cells, indices: ind } = B.pixelate(d, 4, 2, 2, 1, B.PALETTE);
  assert.strictEqual(cells[0], null);
  assert.strictEqual(ind[0], -1);
  assert.strictEqual(ind[1], idx('P18'));
  assert.deepStrictEqual(B.countColors(ind), [{ index: idx('P18'), count: 1 }]);
});

test('pixelate handles large input', () => {
  const W = 4000, H = 3000, d = new Uint8ClampedArray(W * H * 4).fill(200);
  const t = performance.now();
  const { cells } = B.pixelate(d, W, H, 60, 45, B.PALETTE);
  assert.ok(performance.now() - t < 500, 'too slow');
  assert.strictEqual(cells.length, 60 * 45);
});

test('limitColors no-op when under the cap', () => {
  const cells = [[0, 0, 0], [0, 0, 0], [240, 240, 240]];
  const ind = toIdx(cells);
  assert.deepStrictEqual(Array.from(B.limitColors(ind, cells, B.PALETTE, 5)), Array.from(ind));
  const one = [[0, 0, 0]];
  const ind1 = toIdx(one);
  assert.deepStrictEqual(Array.from(B.limitColors(ind1, one, B.PALETTE, 2)), Array.from(ind1));
});

test('limitColors drops rarest color and remaps to nearest remaining', () => {
  // 3 red, 3 blue, 1 green (maps to P10); green must go to whichever is nearer
  const red = [200, 30, 40], blue = [40, 60, 140], green = [30, 120, 60];
  const cells = [red, red, red, blue, blue, blue, green];
  const ind = toIdx(cells);
  const out = B.limitColors(ind, cells, B.PALETTE, 2);
  const used = new Set(out);
  assert.strictEqual(used.size, 2);
  assert.ok(!used.has(idx('P10')), 'green should be gone');
  const lab = B.rgbToLab(green);
  const expect = B.deltaE2000(lab, B.PALETTE[ind[0]].lab) < B.deltaE2000(lab, B.PALETTE[ind[3]].lab) ? ind[0] : ind[3];
  assert.strictEqual(out[6], expect);
});

test('countColors sorts by count desc', () => {
  const r = B.countColors(Int16Array.from([3, 1, 1, -1, 1, 3, 2]));
  assert.deepStrictEqual(r, [{ index: 1, count: 3 }, { index: 3, count: 2 }, { index: 2, count: 1 }]);
});
