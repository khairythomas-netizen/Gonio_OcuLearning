# Atlas specification — OcuLearning gonioscopy simulator

You are producing the image library for a 360°-navigable gonioscopy trainer used to
teach angle assessment. This document is the contract. Build to it, measure the
result, and report the measurements. Do not generate freely and label afterwards.

---

## 1. What the images are actually used for

This is not a picture book. Each plate is loaded as a full **en-face disc**: the pupil
sits at the image centre and the angle anatomy runs round it as concentric rings. The
software places the viewing position outside the disc and orbits it, so the learner
travels the full clock and each hour shows its own tissue.

Four consequences that do not apply to a printed atlas:

- **A finding has a location.** Something drawn at 3 o'clock will be found at 3 o'clock
  and nowhere else. "Travel round the angle and map the extent" is a teaching goal, so
  focal findings must be genuinely focal and circumferential ones genuinely continuous.
- **The 12 o'clock join is visible.** The disc is sampled as a continuous annulus. Any
  seam, discontinuity or lighting step where the image wraps will show as a hard edge.
- **Anatomy must sit at fixed radii.** Interactive anatomy masks are calibrated to the
  radii in §3. When a plate honours them, every teaching mode works on it. When it does
  not, the highlight lands on the wrong tissue, so masks have to be disabled — which is
  why they are currently limited to one plate out of twenty-seven.
- **Plates are compared directly.** The trainer shows series side by side. Two images
  that differ in exposure cannot teach a difference in pigment.

## 2. The change that matters most

Three atlas packages have been produced. The failures were not artistic.

- The first assigned labels **by position in a list**. A hyphema was captioned as a MIGS
  implant. Its five Shaffer plates measured 0.750–0.764 on iris-edge radius — a spread of
  0.014, non-monotonic, with the "closed" plate reading wider than the "open" one. There
  was no graded series; there were five similar pictures with five different captions.
- The second read the pixels but still misread plates it marked high-confidence: angle
  neovascularization called heavy pigmentation, a light band called heavy, a granular
  band called normal.
- The third is honest and usable, and its labels were checked plate by plate. But 41 of
  108 plates are review-only, two cases have no exemplar at all, and one image was
  serving two different diagnoses.

The common root: **images were generated first and interpreted second.** Interpretation
cannot create a property the image does not have. A graded series has to be *built*
graded.

So: define the target, generate to it, measure it, and ship the measurements. Every
requirement below is stated as a number you can check.

## 3. Geometry contract

Hard requirements. A plate that misses these cannot be used with masks.

- **1254 × 1254 PNG**, sRGB, 8-bit, no alpha, no annotation of any kind — no plate
  number, caption, arrow, scale bar or watermark.
- **Pupil centre = image centre**, within ±3 px on both axes.
- **Concentric anatomy.** Radii below are fractions of the half-width (627 px), measured
  from the image centre. Tolerance **±0.006**.

| Structure | inner | outer |
|---|---|---|
| Iris | 0.540 | 0.763 |
| Ciliary body band | 0.757 | 0.786 |
| Scleral spur | 0.786 | 0.802 |
| Trabecular meshwork | 0.802 | 0.858 |
| Schwalbe's line | 0.846 | 0.872 |
| Cornea | 0.878 | 0.990 |

The small overlaps are intentional and match the software.

- **Seamless at 12 o'clock.** Sample the annulus at r = 0.83 and compare the first and
  last columns: mean channel difference must be under 3/255.
- **No directional vignette.** Brightness must not fall off toward one side, or the
  learner will read the lighting as pathology when they orbit.

## 4. Photometric contract

Within any series intended for comparison, all plates share one rendering baseline:
identical illumination, white balance and exposure.

Checkable test: the **cornea band (r 0.88–0.95) is the invariant reference tissue.** Its
median luminance must agree across every plate in a series to within **±4/255**. If it
does not, the series is not comparable and any severity claim made from it is an artefact
of exposure.

## 5. Series that must vary exactly one property

### 5.1 Shaffer grading series — vary only the iris insertion radius

Same eye, same iris colour, same pigment load, same illumination. The **only** difference
between the five plates is how far out the iris runs before the angle opens.

Measure iris edge by the method in §8. Targets, with the current library for reference:

| Grade | Deepest structure visible | Iris-edge target | Current | Status |
|---|---|---|---|---|
| 4 — wide open | ciliary body band | 0.745 – 0.755 | 0.750 | meets spec |
| 3 — open | scleral spur | 0.765 – 0.780 | 0.766 | meets spec |
| 2 — narrow | trabecular meshwork | 0.790 – 0.800 | 0.792 | meets spec |
| 1 — very narrow | Schwalbe's line only | 0.850 – 0.865 | 0.836 | **too shallow — remake** |
| 0 — closed | none | ≥ 0.880 | 0.883 | **content wrong — remake** |

Two specific remakes:

- **Grade 1** at 0.836 still leaves trabecular meshwork exposed, which is a grade 2
  appearance. The iris must reach Schwalbe's so that Schwalbe's line is the only
  landmark left.
- **Grade 0** currently shows an extensive vascular membrane with landmarks surviving on
  one side. That is a neovascular closure, not a grading standard. Supply a **clean,
  uniform, circumferential iridotrabecular apposition** with no vessels and no
  sector-to-sector variation. This is the calibration plate for the whole scale.

### 5.2 Pigment series — vary only pigment density

Same insertion throughout (grade 4, ciliary body band visible), so that the learner is
reading pigment and nothing else. Pigment occupies the trabecular band (0.802–0.858) and
must not be confused with the naturally dark ciliary body band — over-reading the band as
pigment is the commonest grading error and the series should make it impossible.

Four steps, evenly separated by measured mean luminance of the trabecular band:

| Step | Description | Target band luminance |
|---|---|---|
| 1+ | trace, evenly distributed | 150 – 170 |
| 2+ | light-moderate, continuous | 115 – 135 |
| 3+ | dense, granular | 80 – 100 |
| 4+ | very dense, near-black | 45 – 65 |

Also supply, at fixed 2+ density, three **distribution** variants: even circumferential,
inferior-predominant (graded, heaviest at 6 o'clock), and sectoral (a defined arc, sharp
edges, everything else at 1+).

### 5.3 Every other series

Same rule. Name the one property that varies, hold everything else constant, state the
measurement that demonstrates it.

## 6. Place findings on the clock

Image clock: **12 top, 3 right, 6 bottom, 9 left.** For every plate, declare in the
manifest the clock span of each finding, for example `"finding_span": [4.5, 7.5]`.

Focal findings must be sharply bounded and continuous ones must be genuinely continuous.
A "sectoral" finding that quietly extends round the whole angle destroys the exercise,
because mapping the extent is the thing being taught.

## 7. What is missing and needed

These are the actual gaps. Each needs the listed feature to be plainly visible, not implied.

| Case | Must show |
|---|---|
| **Plateau iris** | Flat central iris with an abrupt, anteriorly-inserting root; angle uniformly narrow all round; deep central chamber. Ideally a pair — before and during indentation — since the double hump is what defines it. |
| **Pigment dispersion** | Wide-open angle, dense homogeneous *black* band in the posterior meshwork, concave mid-peripheral iris, Sampaolesi line. Must be visibly homogeneous, to contrast with pseudoexfoliation. |
| **Pseudoexfoliation** | Same view but *clumped and irregular* pigment plus visible flecks of exfoliative material. The contrast against pigment dispersion is the lesson. |
| **Clean Grade 0** | See §5.1. |
| **Post-trabeculoplasty** | Discrete, evenly spaced burn scars along the anterior pigmented meshwork over a declared arc. The current plate shows nonspecific pale material. |
| **PAS vs iris processes** | A matched pair at identical geometry: fine lacy processes following the recess, and broad synechiae bridging it. Ideally each with an indentation variant, since fixed-versus-mobile is the only reliable discriminator. |
| **MIGS devices** | Identifiable implants seated in the angle — trabecular stent, gel stent, drainage tube — each recognisable by its own form. |

Indentation pairs are worth more than any single plate. Where an entity is defined by its
dynamic behaviour — plateau iris, PAS, appositional versus synechial closure — a still
image cannot demonstrate it, and a matched before/after pair can.

## 8. Self-QA you must run and report

Run these on every plate and ship the numbers. This is the algorithm the receiving
project uses, so matching it means no surprises.

**Iris-edge radius**
1. Centre `(w/2, h/2)`; `half = w/2`.
2. For each radius fraction `rf` from 0.55 to 0.92 in steps of 0.002, sample 720 points
   evenly round the circle and compute the mean of `(red − blue)`. This separates orange
   iris from the grey angle structures far more reliably than luminance.
3. Record the peak value `pk` at radius `pkr` — that is iris.
4. Scan outward from `pkr` and report the first `rf` where the mean falls below
   `0.5 × pk`. That is the iris edge.

**Also report per plate**
- centre offset in px
- measured inner/outer radius of each visible band
- median luminance of the cornea band (0.88–0.95)
- mean luminance of the trabecular band (0.802–0.858)
- the 12 o'clock seam difference from §3

**And per series** — confirm the varied property is monotonic across the series and that
every other measured property is constant within tolerance. A series that fails this is
not a series.

## 9. Deliverable format

```
atlas/
  images/          1254×1254 PNGs, descriptive filenames, no annotations
  manifest.csv     one row per plate
  measurements.csv the §8 numbers per plate
  README.md        what changed, what is still missing
```

`manifest.csv` columns:

| Column | Meaning |
|---|---|
| `image_number` | stable identifier, never a position in a directory listing |
| `filename` | |
| `label` | what the plate shows |
| `visible_evidence` | what is literally visible that supports the label |
| `teaching_limit` | what this plate cannot establish |
| `finding_span` | clock span, e.g. `[4.5, 7.5]`, or `circumferential` |
| `structures_visible` | which of the six are present — drives per-case masks |
| `series` / `series_step` | membership and position in a graded set |
| `shaffer_grade` | only where built to §5.1, else empty |
| `source_pages` | page references in both textbooks |

`structures_visible` matters: not every layer is present in every pathology, and
declaring absence lets the trainer disable the right mask instead of highlighting tissue
that is not there.

## 10. Rules to keep

The most recent package got these right. Do not regress.

- **Never label by position in a list.** Every label is read off its own image.
- **State visible evidence and a limit for every plate.** "Dark irregular granules occupy
  the posterior band" is evidence. "Pigment dispersion syndrome" is an inference.
- **Qualify honestly.** "or", "possible", "pattern", "not gradable" are correct answers.
- **Never infer from a still image** a measured angle in degrees, a Spaeth insertion, an
  actual insertion depth, or an indentation response. If a property needs the slit lamp,
  it does not go in the manifest.
- **Flag review-only plates** rather than promoting them. A smaller trustworthy set beats
  a large uncertain one.
- **Preserve source images byte-for-byte** and ship hashes.
- Say plainly that these are synthetic teaching illustrations without clinician sign-off.

## 11. Reference criteria

1. Wallace L. M. Alward. *Color Atlas of Gonioscopy*. Wolfe / Mosby-Year Book Europe, 1994.
2. Atilla Bayer and George L. Spaeth, eds. *Gonioscopy: Microinvasive Glaucoma Surgery Era*. Springer Nature, 2026.

Shaffer grading follows Alward Table 1: grade 4 = 35–45°, ciliary body band visible;
3 = 20–35°, spur visible; 2 = 20°, meshwork visible; 1 = ≤10°, Schwalbe's only;
0 = 0°, closed.

---

## Priority

If the whole set cannot be rebuilt at once, this order delivers the most teaching value:

1. **A clean Grade 0** and **a corrected Grade 1** — they complete the grading scale, which
   is the backbone of the trainer.
2. **The four-step pigment series** to §4 and §5.2, so severity becomes teachable rather
   than asserted.
3. **The PAS / iris-processes pair**, with indentation variants.
4. **Pigment dispersion and pseudoexfoliation** as a contrasting pair.
5. **Plateau iris**, with indentation.
6. **MIGS devices.**

A plate that meets §3 and §4 and ships its §8 measurements can be dropped straight in.
