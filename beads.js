// Bead palette, color math and image -> bead grid conversion.
// Classic script (works from file://); also exported for Node tests.

const PALETTE_RAW = [
  ['P01', 'White', '#F1F1F1'],
  ['P02', 'Cream', '#E0DEA9'],
  ['P03', 'Yellow', '#ECD800'],
  ['P56', 'Pastel Yellow', '#FEF68C'],
  ['P57', 'Cheddar', '#F1AA0C'],
  ['P04', 'Orange', '#ED6120'],
  ['P05', 'Red', '#BF2633'],
  ['P20', 'Rust', '#8C3A24'],
  ['P33', 'Peach', '#EEBAB2'],
  ['P06', 'Bubblegum', '#DD6698'],
  ['P83', 'Pink', '#E64A8C'],
  ['P38', 'Magenta', '#F22B95'],
  ['P07', 'Purple', '#604089'],
  ['P54', 'Pastel Lavender', '#8A72C1'],
  ['P08', 'Dark Blue', '#2B3F87'],
  ['P09', 'Light Blue', '#3370C0'],
  ['P52', 'Pastel Blue', '#6797D3'],
  ['P62', 'Turquoise', '#2B89C6'],
  ['P58', 'Toothpaste', '#93C8D4'],
  ['P10', 'Dark Green', '#1C753E'],
  ['P11', 'Light Green', '#56BA9F'],
  ['P53', 'Pastel Green', '#76C882'],
  ['P61', 'Kiwi Lime', '#6CBE13'],
  ['P35', 'Tan', '#CDA67F'],
  ['P21', 'Light Brown', '#815D34'],
  ['P12', 'Brown', '#513E32'],
  ['P17', 'Grey', '#8A8D91'],
  ['P92', 'Dark Grey', '#4D5156'],
  ['P18', 'Black', '#2E2F32'],
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// sRGB (D65) -> CIELAB
function rgbToLab([r, g, b]) {
  const lin = c => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / 1.0;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 (Sharma, Wu, Dalal 2005)
function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar7 = Math.pow((C1 + C2) / 2, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) * deg + 360) % 360);
  const h1p = hp(a1p, b1), h2p = hp(a2p, b2);

  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  const l = dLp / Sl, c = dCp / Sc, h = dHp / Sh;
  return Math.sqrt(l * l + c * c + h * h + Rt * c * h);
}

const PALETTE = PALETTE_RAW.map(([code, name, hex]) => ({
  code, name, hex, lab: rgbToLab(hexToRgb(hex)),
}));

// Index of the closest palette entry. `allowed` (optional) restricts candidates.
function nearest(lab, palette, allowed) {
  let best = -1, bestD = Infinity;
  const n = allowed ? allowed.length : palette.length;
  for (let k = 0; k < n; k++) {
    const i = allowed ? allowed[k] : k;
    const d = deltaE2000(lab, palette[i].lab);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

const MAX_H = 200;

// Grid size for a given width in beads; height follows the image's aspect ratio.
function gridSize(imgW, imgH, beadsWide) {
  const h = Math.min(MAX_H, Math.max(1, Math.round((imgH / imgW) * beadsWide)));
  return { w: beadsWide, h };
}

// Box-average every source pixel into its cell (one pass, alpha-weighted).
// Returns w*h cells, row-major; null = mostly transparent (no bead).
function pixelate(rgba, imgW, imgH, w, h) {
  const n = w * h;
  const sr = new Float64Array(n), sg = new Float64Array(n), sb = new Float64Array(n);
  const sa = new Float64Array(n), cnt = new Uint32Array(n);
  const colOf = new Int32Array(imgW);
  for (let x = 0; x < imgW; x++) colOf[x] = Math.min(w - 1, Math.floor((x * w) / imgW));
  for (let y = 0; y < imgH; y++) {
    const rowBase = Math.min(h - 1, Math.floor((y * h) / imgH)) * w;
    let p = y * imgW * 4;
    for (let x = 0; x < imgW; x++, p += 4) {
      const c = rowBase + colOf[x], a = rgba[p + 3];
      sr[c] += rgba[p] * a; sg[c] += rgba[p + 1] * a; sb[c] += rgba[p + 2] * a;
      sa[c] += a; cnt[c]++;
    }
  }
  const cells = new Array(n);
  for (let c = 0; c < n; c++) {
    if (cnt[c] === 0 || sa[c] / cnt[c] < 128) { cells[c] = null; continue; }
    cells[c] = [Math.round(sr[c] / sa[c]), Math.round(sg[c] / sa[c]), Math.round(sb[c] / sa[c])];
  }
  return cells;
}

// Palette index per cell; -1 = empty. Identical colors are matched once.
function mapToPalette(cells, palette) {
  const out = new Int16Array(cells.length);
  const memo = new Map();
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (!c) { out[i] = -1; continue; }
    const key = (c[0] << 16) | (c[1] << 8) | c[2];
    let k = memo.get(key);
    if (k === undefined) { k = nearest(rgbToLab(c), palette); memo.set(key, k); }
    out[i] = k;
  }
  return out;
}

// [{index, count}] for used colors, most used first (ties: lower index first).
function countColors(indices) {
  const m = new Map();
  for (const i of indices) if (i >= 0) m.set(i, (m.get(i) || 0) + 1);
  return [...m].map(([index, count]) => ({ index, count }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
}

// Reduce to at most maxColors: repeatedly drop the least-used color and move
// its cells to their nearest remaining color (judged on the cell's original RGB).
function limitColors(indices, cells, palette, maxColors) {
  const out = Int16Array.from(indices);
  let counts = countColors(out);
  while (counts.length > maxColors) {
    const drop = counts[counts.length - 1].index;
    const remaining = counts.slice(0, -1).map(c => c.index).sort((a, b) => a - b);
    for (let i = 0; i < out.length; i++) {
      if (out[i] === drop) out[i] = nearest(rgbToLab(cells[i]), palette, remaining);
    }
    counts = countColors(out);
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    PALETTE, hexToRgb, rgbToLab, deltaE2000, nearest,
    gridSize, pixelate, mapToPalette, countColors, limitColors,
  };
}
