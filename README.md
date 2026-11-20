# Bead Chart Maker

Turn any image into a numbered fuse-bead (Perler-style) chart. Each cell gets the
closest bead color from a basic 29-color palette (CIEDE2000 color matching).

- **Use:** open `perler.html` (double-click works), or the hosted page.
- **Phone, offline:** open the hosted page in Safari → Share → Add to Home Screen.
  After the first visit it works with no signal.
- **Controls:** width in beads, max colors, chart / bead preview, Save PNG, Print.
- Images never leave your device.

Palette lives in `PALETTE_RAW` in `beads.js`; hex values are approximate
(real beads vary by batch). Tests: `npm test`.

## Releasing an update
Bump `VERSION` in `sw.js` on every change, or installed phones keep the old copy.
Files are cached as one set, so a phone never mixes old and new files.

## Browser tests
Need Playwright and a Chromium build:
`python3 -m http.server 8765 &` then
`CH=<chrome path> node test/browser/e2e.js <path to playwright>` and
`CH=<chrome path> node test/browser/sw-update.js <path to playwright>`.
