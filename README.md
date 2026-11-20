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
