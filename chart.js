// Drawing: bead-look preview and the numbered build chart.
// Classic script; uses countColors from beads.js (global in the browser).

const CELL = 22;        // chart cell size, px
const MARGIN = 28;      // room for row/column numbers
const HEADER = 44;      // title line
const LEG_ITEM_W = 190, LEG_ROW_H = 30;

// Black text on light beads, white on dark ones (CIELAB lightness).
function textColorFor(entry) {
  return entry.lab[0] > 55 ? '#000' : '#fff';
}

function shortCode(code) {
  return code.replace(/^P/, '');
}

// Round beads with a hole, like the finished piece.
function drawPreview(canvas, indices, w, h, palette) {
  const s = 12;
  canvas.width = w * s + 2 * s;
  canvas.height = h * s + 2 * s;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f4f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = indices[y * w + x];
      if (k < 0) continue;
      const cx = s + x * s + s / 2, cy = s + y * s + s / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
      ctx.arc(cx, cy, s * 0.17, 0, Math.PI * 2, true);
      ctx.fillStyle = palette[k].hex;
      ctx.fill();
    }
  }
}

function drawChart(canvas, indices, w, h, palette) {
  const counts = (typeof countColors === 'function' ? countColors : require('./beads.js').countColors)(indices);
  const total = counts.reduce((s, c) => s + c.count, 0);

  const gridW = w * CELL, gridH = h * CELL;
  const width = Math.max(gridW + 2 * MARGIN, 2 * LEG_ITEM_W + 2 * MARGIN);
  const perRow = Math.max(1, Math.floor((width - 2 * MARGIN) / LEG_ITEM_W));
  const legendH = Math.ceil(counts.length / perRow) * LEG_ROW_H + 20;
  const gx = Math.round((width - gridW) / 2), gy = HEADER + MARGIN;

  canvas.width = width;
  canvas.height = gy + gridH + MARGIN + legendH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#111';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`${w}×${h} / ${counts.length} colors / ${total} beads`, MARGIN, HEADER / 2 + 4);

  // Cells
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px system-ui, sans-serif';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = indices[y * w + x];
      if (k < 0) continue;
      const p = palette[k], px = gx + x * CELL, py = gy + y * CELL;
      ctx.fillStyle = p.hex;
      ctx.fillRect(px, py, CELL, CELL);
      ctx.fillStyle = textColorFor(p);
      ctx.fillText(shortCode(p.code), px + CELL / 2, py + CELL / 2 + 0.5);
    }
  }

  // Grid lines: thin every cell, medium every 5, thick every 10
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const STYLES = [['#ccc', 0.6], ['#777', 1.2], ['#d23c3c', 2]];
  const level = (i, n) => (i % 10 === 0 || i === n ? 2 : i % 5 === 0 ? 1 : 0); // outer edge = thick
  for (let lvl = 0; lvl < 3; lvl++) {              // thick lines last so they sit on top
    [ctx.strokeStyle, ctx.lineWidth] = STYLES[lvl];
    for (let i = 0; i <= w; i++) if (level(i, w) === lvl) line(gx + i * CELL, gy, gx + i * CELL, gy + gridH);
    for (let j = 0; j <= h; j++) if (level(j, h) === lvl) line(gx, gy + j * CELL, gx + gridW, gy + j * CELL);
  }

  // Row/column numbers on all four sides
  ctx.fillStyle = '#666';
  ctx.font = '10px system-ui, sans-serif';
  for (let x = 0; x < w; x++) {
    const cx = gx + x * CELL + CELL / 2;
    ctx.fillText(x + 1, cx, gy - MARGIN / 2);
    ctx.fillText(x + 1, cx, gy + gridH + MARGIN / 2);
  }
  for (let y = 0; y < h; y++) {
    const cy = gy + y * CELL + CELL / 2;
    ctx.fillText(y + 1, gx - MARGIN / 2, cy);
    ctx.fillText(y + 1, gx + gridW + MARGIN / 2, cy);
  }

  // Legend: swatch with code, name, count
  const ly = gy + gridH + MARGIN + 10;
  ctx.textAlign = 'left';
  counts.forEach(({ index, count }, n) => {
    const p = palette[index];
    const x = MARGIN + (n % perRow) * LEG_ITEM_W, y = ly + Math.floor(n / perRow) * LEG_ROW_H;
    ctx.fillStyle = p.hex;
    ctx.fillRect(x, y, 34, 22);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 33, 21);
    ctx.fillStyle = textColorFor(p);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.code, x + 17, y + 11.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#222';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${p.name} ×${count}`, x + 42, y + 11.5);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { textColorFor, drawPreview, drawChart };
}
