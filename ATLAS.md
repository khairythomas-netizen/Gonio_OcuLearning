# Atlas provenance

Case imagery comes from the **OcuLearning Gonioscopy Atlas — 2026-09-07 reconciliation**.
`atlas-reconciliation.csv` is that package's 108-row index, kept here so every case
in `data.js` can be traced to a plate, its visible evidence, its stated teaching
limit, and page references in both textbooks.

Reference criteria:

1. Wallace L. M. Alward. *Color Atlas of Gonioscopy*. Wolfe / Mosby-Year Book Europe, 1994.
2. Atilla Bayer and George L. Spaeth, eds. *Gonioscopy: Microinvasive Glaucoma Surgery Era*. Springer Nature, 2026.

## What the images are

Synthetic teaching illustrations, not patient photography. Labels were rebuilt by
visual review of each plate rather than by sequence position, and were verified here
before adoption: all 108 source PNGs are byte-identical to the originals, and the
Normal and Wide Open masters are exact copies of `disc.png` and `atlas_closure_g4.png`
from this repository.

Two earlier atlas packages were rejected. One labelled 90 of 108 plates by their
position in a list, which put a hyphema under a MIGS-implant caption and produced a
Shaffer series with no measurable change in angle width. The other was closer but
misread several plates with high confidence, calling angle neovascularization heavy
pigmentation.

## Reading the cases honestly

Descriptions state what is visible and stop there. No case infers a measured angle in
degrees, a Spaeth insertion, or an indentation response from a still image, because
none of those can be read from one.

Three cases carry a `needsMaterial` notice, shown to the user above the description:

- **Plateau iris** — no confirmed exemplar; the normal angle is a backdrop only.
- **Pigment dispersion syndrome** — the previous plate was the same image as the
  angle-recession case, so it was withdrawn.
- **Patchy pale angle material** (formerly "after laser trabeculoplasty") — the plate
  does not show discrete trabeculoplasty burns.

The Shaffer 0–4 sequence keeps its authored designations; those are teaching labels
for a progression, not measured angular approaches. Grade 0 in particular shows a
vascular membrane with some landmarks surviving on one side, so it is not a clean
uniform appositional closure — the case text says so.

Still needed from clinical material: indentation-confirmed PAS, plateau iris,
a pure closed-angle calibration standard, numeric pigment standards, and
identifiable MIGS devices.
