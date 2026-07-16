# Gonioscopy Simulator

A browser-based teaching tool for gonioscopy: schematic cross-sections of the
anterior chamber angle, rotated clock-hour by clock-hour, with structure
labelling and Shaffer/Spaeth grading practice.

Schematic only — not photorealistic, not for clinical use.

## Quick start

Just open `index.html` in a browser. No build step, no server, no dependencies.

(Optional) to serve it instead of using `file://`:

```bash
python3 -m http.server 8000
```

## What it does

- **Explore** — pick a case, rotate through all 12 clock hours, and see which
  angle structures (Schwalbe's line, trabecular meshwork, scleral spur,
  ciliary body band, iris root) are visible at each position, plus the
  Shaffer grade and Spaeth notation for that clock hour.
- **Label quiz** — click a structure in the diagram and identify it from
  multiple choice.
- **Grading quiz** — given the current clock-hour view, pick the correct
  Shaffer grade.

Six preset cases: normal open angle, primary angle closure, pigment
dispersion syndrome, neovascular glaucoma, plateau iris syndrome, and chronic
angle closure with PAS.

## Files

- `index.html` / `styles.css` — page shell and layout
- `data.js` — case definitions, structure metadata, Shaffer/Spaeth grading logic
- `render.js` — SVG drawing of the angle cross-section and clock dial
- `app.js` — state and event wiring for the three modes
