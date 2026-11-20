# Bead Template Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web page that turns an image into a numbered fuse-bead chart using the closest colors from a basic bead palette, usable offline on a phone.

**Architecture:** Pure logic (palette, color math, pixelation, color limiting) lives in `beads.js` as a classic script that also exports via `module.exports` so Node can test it. `chart.js` draws the preview and chart onto a canvas. `perler.html` wires inputs and controls. `sw.js` + `manifest.json` make it installable and offline.

**Tech Stack:** Vanilla JS, Canvas 2D, Node 24 built-in test runner (`node --test`), Playwright's cached `chromium_headless_shell-1217` for screenshots.

**Spec:** `docs/design.md`

## Global Constraints
- No dependencies, no CDN, no build step. Everything works when `perler.html` is opened via `file://` (so classic `<script src>` tags, not ES modules).
- Images never leave the device.
- Small basic palette (~29 Perler colors), stored as one array `PALETTE` so other palettes can be added later.
- No dithering.
- Hosting: GitHub Pages, repo created by the user; we push over SSH as Ramen-man.
- Deviation from the spec, noted: the spec says "one file". Logic is split into `beads.js`/`chart.js` so it can be tested; it's still dependency-free and works by double-click.

## Review Focus
1. **Big photos (4000×3000 phone shots)** must not freeze the page. Pixelation averages over the downscaled grid, never per-pixel loops over the full image more than once. → Task 2 test `pixelate handles large input`.
2. **Transparent PNGs:** cells that are mostly transparent (alpha avg < 128) stay empty. They aren't counted and aren't drawn as black. → Task 2 test `transparent cells are empty`.
3. **Max colors ≥ colors used**, or an image that is all one color: the color limit is a no-op and must not crash or drop colors. → Task 2 test `limitColors no-op`.
4. **Very tall/narrow images:** height follows the aspect ratio but is clamped to at least 1 and at most 200 cells. → Task 2 test `gridSize clamps`.
5. **Light bead colors on the chart** (white, pastel yellow): the code text must stay readable. Use black text when the bead's L* > 55, else white. → Task 3 test `textColorFor`.

---

### Task 1: Palette and color math

**Files:**
- Create: `beads.js`, `test/beads.test.js`, `package.json` (`{"scripts":{"test":"node --test test/"}}`), `.gitignore`
- Run `git init` first.

**Interfaces — Produces:**
- `PALETTE: Array<{code: string, name: string, hex: string, lab: [L,a,b]}>` (`lab` precomputed)
- `hexToRgb(hex) -> [r,g,b]`, `rgbToLab([r,g,b]) -> [L,a,b]` (sRGB D65)
- `deltaE2000(lab1, lab2) -> number`
- `nearest(lab, palette) -> index`

Palette (code, name, hex):
P01 White #F1F1F1 · P02 Cream #E0DEA9 · P03 Yellow #ECD800 · P56 Pastel Yellow #FEF68C · P57 Cheddar #F1AA0C · P04 Orange #ED6120 · P05 Red #BF2633 · P20 Rust #8C3A24 · P33 Peach #EEBAB2 · P06 Bubblegum #DD6698 · P83 Pink #E64A8C · P38 Magenta #F22B95 · P07 Purple #604089 · P54 Pastel Lavender #8A72C1 · P08 Dark Blue #2B3F87 · P09 Light Blue #3370C0 · P52 Pastel Blue #6797D3 · P62 Turquoise #2B89C6 · P58 Toothpaste #93C8D4 · P10 Dark Green #1C753E · P11 Light Green #56BA9F · P53 Pastel Green #76C882 · P61 Kiwi Lime #6CBE13 · P35 Tan #CDA67F · P21 Light Brown #815D34 · P12 Brown #513E32 · P17 Grey #8A8D91 · P92 Dark Grey #4D5156 · P18 Black #2E2F32

- [ ] **Step 1: Write failing tests**
  - `rgbToLab([255,255,255])` ≈ `[100, 0, 0]` (±0.01)
  - `deltaE2000([50,2.6772,-79.7751],[50,0,-82.7485])` ≈ 2.0425 (±0.0001), the Sharma reference pair; also `([50,0,0],[50,-1,2])` ≈ 2.3669
  - `nearest(rgbToLab([250,250,250]), PALETTE)` → code `P01`; `[0,0,0]` → `P18`; `[255,0,0]` → `P05`
  - every palette code unique, every hex matches `/^#[0-9A-F]{6}$/`
- [ ] **Step 2:** `npm test` → FAIL (module not found)
- [ ] **Step 3:** Implement in `beads.js`; end the file with `if (typeof module !== 'undefined') module.exports = {...}`
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** Commit `feat: bead palette and CIEDE2000 color matching`

### Task 2: Pixelate and limit colors

**Files:** Modify `beads.js`, `test/beads.test.js`

**Interfaces:**
- Consumes: Task 1
- Produces:
  - `gridSize(imgW, imgH, beadsWide) -> {w, h}`: `h = round(imgH/imgW*w)`, clamped to [1, 200]
  - `pixelate(rgba: Uint8ClampedArray, imgW, imgH, w, h) -> Array<[r,g,b] | null>` (length w*h, row-major; `null` = transparent). Box-average each cell, weighting RGB by alpha.
  - `mapToPalette(cells, palette) -> Int16Array` (palette index per cell, −1 = empty)
  - `limitColors(indices, cells, palette, maxColors) -> Int16Array`: while the number of distinct used colors > max, take the least-used color and remap each of its cells to the nearest *remaining used* color for that cell's original RGB. Ties are broken by lower palette index.
  - `countColors(indices) -> Array<{index, count}>`, sorted by count desc

- [ ] **Step 1: Failing tests:** `gridSize(1000,500,50)` → `{w:50,h:25}`; `gridSize(10,5000,50)` → h 200; `gridSize(5000,10,50)` → h 1. A 4×4 half-red/half-blue image pixelated to 2×1 gives `[[255,0,0],[0,0,255]]`. A fully transparent cell → `null` → index −1, and it's not counted. `limitColors` with max ≥ used returns the same values. An image with 3 colors where green is rarest, max 2 → no green remains, and the green cells go to whichever of red/blue is nearer. `pixelate handles large input`: 4000×3000 → 60×45 in < 500 ms.
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** Commit `feat: pixelation and color limiting`

### Task 3: Chart and preview rendering

**Files:** Create `chart.js`; add tests for `textColorFor` to `test/chart.test.js`

**Interfaces:**
- Consumes: `PALETTE`, `countColors`
- Produces:
  - `textColorFor(paletteEntry) -> '#000' | '#fff'` (L* > 55 → black)
  - `drawPreview(canvas, indices, w, h, palette)`: round beads on a light background, 12 px/cell
  - `drawChart(canvas, indices, w, h, palette)`, laid out top to bottom:
    - header text `W×H / N colors / total beads` (e.g. `58×40 / 9 colors / 1832 beads`)
    - numbered margins on all four sides
    - cells 22 px, filled with the bead color and the code in `textColorFor` (bold, ~8px; drop the leading "P")
    - empty cells white; thin grid lines; medium line every 5; thick line every 10
    - legend rows: swatch, code, name, count
- [ ] **Step 1:** Failing tests: `textColorFor(P01)` → `#000`, `textColorFor(P18)` → `#fff`
- [ ] **Step 2–4:** fail → implement → pass
- [ ] **Step 5:** Visual check happens in Task 4 (needs the page)
- [ ] **Step 6:** Commit `feat: chart and bead preview rendering`

### Task 4: Page and controls

**Files:** Create `perler.html`, `test/sample.png` (a generated test image with transparency, made with Python/Pillow)

**Interfaces:** Consumes everything above.

- Inputs: file picker (`accept="image/*"`), drag-and-drop on the page, paste from the clipboard.
- Controls: width slider 10–120 (default 50) with a number readout; max colors slider 2–29 (default 12); Preview/Chart toggle; Save PNG (`canvas.toBlob` → download `bead-chart-WxH.png`); Print (`window.print()`, with print CSS showing only the chart).
- Image load → draw to an offscreen canvas, at most 1600 px on the long side (performance) → `getImageData` → pipeline → render. Re-render on control `input`.
- Layout: controls on top, chart in a scrollable box below; works at 375 px width. Respect `prefers-color-scheme` for page chrome. The chart itself always has a white background (it's printable).
- [ ] **Step 1:** Build the page
- [ ] **Step 2:** Add a `?demo` URL param that loads `test/sample.png` automatically, so headless screenshots work without a file picker
- [ ] **Step 3:** Screenshot via `~/.cache/ms-playwright/chromium_headless_shell-1217/chrome-*/chrome-headless-shell --headless --allow-file-access-from-files --screenshot=... --window-size=1200,1600 'file://.../perler.html?demo'` at desktop and 390-px widths, in both views. Check: header numbers, codes readable, lines every 5/10, legend counts sum to the total.
- [ ] **Step 4:** Commit `feat: bead template page`

### Task 5: Offline + GitHub Pages

**Files:** Create `manifest.json`, `sw.js`, `icon.png` (192 and 512, a generated pixel-bead icon), `README.md`; modify `perler.html` (manifest link, `apple-touch-icon`, SW registration guarded by `location.protocol.startsWith('http')`); add `index.html` that redirects to `perler.html`.

- `sw.js`: cache name `beads-v1`; precache `./`, `index.html`, `perler.html`, `beads.js`, `chart.js`, `manifest.json`, `icon-192.png`, `icon-512.png`; cache-first fetch.
- [ ] **Step 1:** Implement
- [ ] **Step 2:** Verify locally: `python3 -m http.server 8765`, load in headless Chrome, confirm in the console that the SW registered; then re-run the screenshot and confirm it still renders
- [ ] **Step 3:** Commit `feat: offline support`
- [ ] **Step 4:** **Ask the user** to create an empty public repo on github.com (suggested name `bead-chart`). Then add the remote `git@github.com:Ramen-man/<repo>.git` and push `main` (confirm before pushing).
- [ ] **Step 5:** User enables Settings → Pages → Deploy from branch `main` / root. We confirm `https://ramen-man.github.io/<repo>/` loads.
