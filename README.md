# Gonioscopy Simulator

A browser-based teaching tool for gonioscopy: a continuous en-face view of the
anterior chamber angle that you spin clock-hour by clock-hour, with structure
labelling and Shaffer/Spaeth grading practice.

Teaching aid — not for clinical use.

## Quick start

Just open `index.html` in a browser. No build step and no dependencies.

(Optional) to serve it over HTTP instead of `file://`:

```bash
node serve.js
```

## What it does

- **Explore** — pick a case, spin through all 12 clock hours with the rotary
  dial, and hover any angle structure (in the view or the side list) to glow
  it: iris root, ciliary body band, scleral spur, trabecular meshwork,
  Schwalbe's line, cornea.
- **Label quiz** — you're asked to find a structure and click it in the view.
- **Grading** — shows the Shaffer grade and Spaeth notation for the selected
  case at the current clock hour.

An **Anatomy masks** toggle turns the hover highlighting on and off.

Six preset cases: normal open angle, primary angle closure, pigment
dispersion syndrome, neovascular glaucoma, plateau iris syndrome, and chronic
angle closure with PAS.

## How the view works

The angle view is a single hand-made en-face 360° disc (`disc.png`: pupil at
the centre, iris → trabecular meshwork → sclera as concentric rings) drawn
zoomed into its top arc, giving the oblique gonio view. Scrolling/spinning
rotates and orbits that one image, so travel around the clock is perfectly
seamless — no frames, no cross-fade. Because the anatomy is concentric, the
hover masks are simple rings about the disc centre.

## Files

- `index.html` / `styles.css` — page shell, OcuLearning-styled layout
- `viewer.js` — the seamless disc viewer (`window.__gonioViewer`), hover masks,
  inertial spin, and the in-page calibration tool
- `app-glue.js` — wires the viewer to the UI: sidebar, mask toggle, clock-hour
  dial, and the three modes
- `data.js` — case definitions, structure metadata, Shaffer/Spaeth grading logic
- `disc.png` — the en-face angle disc; `reel.png` — the clock-hour dial glyph
- `serve.js` — a tiny static dev server
