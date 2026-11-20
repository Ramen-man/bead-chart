# Bead Template Maker — Design

## Intent
Turn any image into a fuse-bead (Perler-style) build chart like the Xiaohongshu
templates: a code in every cell, numbered edges, a bead count per color. The user
has no beads yet, so colors must come from a small basic set every brand sells.

## Goals
- Drop in an image → get a printable/saveable chart.
- Every cell is mapped to the **closest available bead color** (perceptual, not raw RGB).
- Live adjustment of size and number of colors.
- Works on desktop and phone, no install.

## Non-goals
- Full brand palettes (Perler/MARD full ranges) — the palette is a swappable list, add later.
- Dithering (makes bead art noisy), editing individual cells, multi-pegboard splitting.

## Approaches
- **A. Single HTML page (picked by user).** Live sliders, works on phone, nothing to install.
- B. Python CLI → PNG. Simpler, but every tweak is a rerun.

## Design
- One file: `perler.html`, vanilla JS + canvas, no dependencies.
- **Input:** file picker, drag-and-drop, paste.
- **Controls:** width in beads (height follows aspect ratio), max colors,
  view toggle (bead preview / chart).
- **Resize:** average all source pixels in each cell (box filter). Cells that are
  mostly transparent → empty (no bead).
- **Color match:** convert to CIELAB, pick the nearest palette color by CIEDE2000.
- **Color limit:** if more colors are used than the max, repeatedly drop the
  least-used color and remap its cells to their nearest remaining color.
- **Palette:** ~28 basic colors (black, white, greys, reds, oranges, yellows,
  greens, blues, purples, pinks, skin tones, browns) with Perler codes/names and
  approximate hex values. Stored as one array so other palettes can be added later.
- **Chart output** (one canvas, saved as PNG / printable):
  - header: `W×H / N colors / total beads`
  - each cell filled with its bead color + code in contrasting text
  - row/column numbers on all four edges; thin line every 5, thick every 10
  - legend: swatch, code, name, count — doubles as a shopping list
- **Phone:** controls stack above the chart; chart scrolls/zooms inside its own box.

## Offline on phone
- Hosted on GitHub Pages (user: Ramen-man; SSH push works, `gh` not installed —
  user creates the repo and enables Pages on github.com, we push).
- `manifest.json` + `sw.js` service worker cache the page on first visit, so the
  home-screen icon (Safari → Share → Add to Home Screen) works with no signal.
- Still works by double-clicking `perler.html` on a computer.
- Note: Pages makes the repo/page public (the tool only, no user images).

## Left to the builder
Exact palette hex values (from published charts), styling, cell pixel size.
