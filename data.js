/* Gonioscopy Simulator — data model
   All angle anatomy is schematic/teaching-level, not photorealistic. */

var Gonio = window.Gonio || {};

/* ---- Structures visible in the angle, anterior (cornea) to posterior (ciliary body) ---- */
Gonio.STRUCTURES = [
  { id: "schwalbe", label: "Schwalbe's line", desc: "Termination of Descemet's membrane; the anterior-most angle landmark, often seen as a fine ridge or pigmented line." },
  { id: "tm_np", label: "Non-pigmented trabecular meshwork", desc: "Anterior third of the meshwork; pale, translucent, usually unpigmented." },
  { id: "tm_p", label: "Pigmented trabecular meshwork", desc: "Posterior two-thirds of the meshwork overlying Schlemm's canal; accumulates pigment over time." },
  { id: "spur", label: "Scleral spur", desc: "The whitest, brightest band in the angle; posterior meshwork border and ciliary muscle insertion." },
  { id: "cb", label: "Ciliary body band", desc: "Grey-brown band seen only in wide-open angles, between the scleral spur and the iris root." },
  { id: "iris", label: "Iris root / angle recess", desc: "Where the iris inserts; its position relative to the landmarks above determines the angle grade." }
];

Gonio.structureById = function (id) {
  return Gonio.STRUCTURES.find(function (s) { return s.id === id; });
};

/* ---- Shaffer grading: what the deepest visible structure is ---- */
Gonio.SHAFFER = [
  { grade: 4, range: "35–45°", deepestVisible: "cb", label: "Wide open", note: "Ciliary body band visible." },
  { grade: 3, range: "20–35°", deepestVisible: "spur", label: "Open", note: "Scleral spur visible, ciliary body band not seen." },
  { grade: 2, range: "~20°", deepestVisible: "tm_p", label: "Moderately narrow", note: "Trabecular meshwork visible, spur not seen." },
  { grade: 1, range: "~10°", deepestVisible: "schwalbe", label: "Very narrow", note: "Only Schwalbe's line visible." },
  { grade: 0, range: "0°", deepestVisible: null, label: "Closed", note: "Iridotrabecular contact; no angle structures visible (appositional or synechial)." }
];

/* maps an iris-insertion landmark to its Shaffer grade + approx degrees, used to draw + grade the angle */
Gonio.INSERTION_INFO = {
  cb:       { grade: 4, degrees: 40, spaethLetter: "D" },
  spur:     { grade: 3, degrees: 28, spaethLetter: "C" },
  tm_p:     { grade: 2, degrees: 20, spaethLetter: "B" },
  tm_np:    { grade: 2, degrees: 20, spaethLetter: "B" },
  schwalbe: { grade: 1, degrees: 10, spaethLetter: "A" },
  closed:   { grade: 0, degrees: 0,  spaethLetter: "A" }
};

Gonio.CONTOUR_CODES = {
  flat:    { code: "f", label: "Flat" },
  convex:  { code: "s", label: "Convex / steep (plateau)" },
  concave: { code: "b", label: "Concave (posterior bowing)" }
};

Gonio.spaethNotation = function (hourData) {
  var ins = Gonio.INSERTION_INFO[hourData.pasBridge ? "closed" : hourData.insertion];
  var contour = Gonio.CONTOUR_CODES[hourData.contour];
  return ins.spaethLetter + ins.degrees + contour.code;
};

Gonio.shaffer = function (hourData) {
  if (hourData.pasBridge) return Gonio.SHAFFER.find(function (g) { return g.grade === 0; });
  var info = Gonio.INSERTION_INFO[hourData.insertion];
  return Gonio.SHAFFER.find(function (g) { return g.grade === info.grade; });
};

/* which structures are visible given the insertion point (everything anterior to + including insertion) */
Gonio.visibleStructures = function (hourData) {
  if (hourData.insertion === "closed" || hourData.pasBridge) return [];
  var order = ["schwalbe", "tm_np", "tm_p", "spur", "cb"];
  var idx = order.indexOf(hourData.insertion);
  return order.slice(0, idx + 1);
};

/* ---- helper to build all 12 clock hours from a base + sparse overrides ---- */
function makeClockHours(base, overrides) {
  var hours = {};
  for (var h = 1; h <= 12; h++) {
    hours[h] = Object.assign({}, base, (overrides && overrides[h]) || {});
  }
  return hours;
}

/* ---- Training cases ----
   Each case names a full en-face disc image and (optionally) a group for the
   sidebar. clockHours drives the Shaffer/Spaeth readout; `masks` (when present)
   overrides the default anatomy ring radii for discs whose angle sits
   differently (e.g. the narrow/closed angles). */
Gonio.CASE_GROUPS = [
  "Angle closure — Shaffer grade",
  "Trabecular meshwork pigmentation",
  "Other findings"
];

Gonio.CASES = [
  {
    id: "normal", group: null, disc: "disc.png",
    name: "Normal open angle",
    description: "A healthy angle: wide open all the way round, mild trabecular pigment, no synechiae.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- Angle closure, graded --- */
  {
    id: "closure_g0", group: "Angle closure — Shaffer grade", disc: "closure_g0.png",
    name: "Grade 0 — Closed",
    description: "Iridotrabecular apposition all the way round — no angle structures visible (Shaffer 0). The convex iris meets the cornea; high risk of acute closure.",
    clockHours: makeClockHours(
      { insertion: "closed", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g1", group: "Angle closure — Shaffer grade", disc: "closure_g1.png",
    name: "Grade 1 — Very narrow",
    description: "A very narrow angle — only Schwalbe's line is visible (Shaffer 1). Convex iris; high closure risk.",
    clockHours: makeClockHours(
      { insertion: "schwalbe", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g2", group: "Angle closure — Shaffer grade", disc: "closure_g2.png",
    name: "Grade 2 — Narrow",
    description: "A narrow angle — visible down to the pigmented trabecular meshwork (Shaffer 2). Scleral spur not seen.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g3", group: "Angle closure — Shaffer grade", disc: "closure_g3.png",
    name: "Grade 3 — Open",
    description: "An open angle — scleral spur visible, ciliary body band not seen (Shaffer 3).",
    clockHours: makeClockHours(
      { insertion: "spur", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g4", group: "Angle closure — Shaffer grade", disc: "closure_g4.png",
    name: "Grade 4 — Wide open",
    description: "A wide-open angle — ciliary body band visible all the way round (Shaffer 4).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- Trabecular meshwork pigmentation --- */
  {
    id: "pig_mild", group: "Trabecular meshwork pigmentation", disc: "pig_mild.png",
    name: "Mild pigmentation",
    description: "Wide-open angle with light, even trabecular pigment (1+).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_moderate", group: "Trabecular meshwork pigmentation", disc: "pig_moderate.png",
    name: "Moderate pigmentation",
    description: "Wide-open angle with moderate, even trabecular pigment (2+).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_heavy", group: "Trabecular meshwork pigmentation", disc: "pig_heavy.png",
    name: "Heavy pigmentation",
    description: "Wide-open angle with heavy, dense trabecular pigment (3–4+).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_inferior", group: "Trabecular meshwork pigmentation", disc: "pig_inferior.png",
    name: "Inferior-predominant",
    description: "Wide-open angle; trabecular pigment is denser inferiorly — the usual gravity-dependent pattern.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 } }
    )
  },
  {
    id: "pig_sectoral", group: "Trabecular meshwork pigmentation", disc: "pig_sectoral.png",
    name: "Sectoral inferior",
    description: "Wide-open angle with a localized band of heavy inferior trabecular pigment.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 6: { pigment: 4 }, 7: { pigment: 4 } }
    )
  },

  /* --- Other findings --- */
  {
    id: "angle_recession", group: "Other findings", disc: "angle_recession.png",
    name: "Angle recession",
    description: "Post-traumatic angle recession — an abnormally wide, deep recess with a torn, widened ciliary body band.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pas", group: "Other findings", disc: "pas.png",
    name: "Peripheral anterior synechiae",
    description: "Peripheral anterior synechiae bridging the angle over several inferior clock hours, with an open angle elsewhere.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pasBridge: true, insertion: "schwalbe" },
        6: { pasBridge: true, insertion: "schwalbe" },
        7: { pasBridge: true, insertion: "schwalbe" } }
    )
  },
  {
    id: "pigment_dispersion", group: "Other findings", disc: "pigment_dispersion.png",
    name: "Pigment dispersion syndrome",
    description: "Wide open, concave (myopic) iris with dense homogeneous trabecular pigment and a Sampaolesi line.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "concave", pigment: 4, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "pseudoexfoliation", group: "Other findings", disc: "pseudoexfoliation.png",
    name: "Pseudoexfoliation syndrome",
    description: "Wide open with patchy trabecular pigment, flecks of pseudoexfoliation material, and a Sampaolesi line.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "blood_schlemm", group: "Other findings", disc: "blood_schlemm.png",
    name: "Blood in Schlemm's canal",
    description: "Blood refluxed into Schlemm's canal — a red line at the posterior trabecular meshwork (low IOP / raised episcleral venous pressure).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "cyclodialysis", group: "Other findings", disc: "cyclodialysis.png",
    name: "Cyclodialysis cleft",
    description: "A cyclodialysis cleft — a gap between the ciliary body and scleral spur exposing bare white sclera.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "posterior_embryotoxon", group: "Other findings", disc: "posterior_embryotoxon.png",
    name: "Posterior embryotoxon",
    description: "A prominent, anteriorly-displaced Schwalbe's line (posterior embryotoxon / Axenfeld anomaly).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  }
];

Gonio.caseById = function (id) {
  return Gonio.CASES.find(function (c) { return c.id === id; });
};

/* ---- Continuous interpolation for smooth rotation between clock hours ----
   Positional depth (0-5) places the iris insertion continuously along the
   rendered curve; it is a rendering convenience distinct from Shaffer grade. */
Gonio.POSITION_DEPTH = { closed: 0, schwalbe: 1, tm_np: 2, tm_p: 3, spur: 4, cb: 5 };
Gonio.CONTOUR_BOW = { concave: -1, flat: 0, convex: 1 };

/* wraps any real number into [1, 13), the continuous analogue of clock hours 1-12 */
Gonio.wrapHour = function (h) {
  return ((h - 1) % 12 + 12) % 12 + 1;
};

Gonio.nearestHour = function (continuousHour) {
  var w = Gonio.wrapHour(continuousHour);
  var n = Math.round(w);
  if (n === 13) n = 1;
  if (n === 0) n = 12;
  return n;
};

function depthOf(hourData) {
  return hourData.pasBridge ? 0 : Gonio.POSITION_DEPTH[hourData.insertion];
}

/* returns a continuously-blended visual state between the two nearest clock hours */
Gonio.visualState = function (caseObj, continuousHour) {
  var wrapped = Gonio.wrapHour(continuousHour);
  var hourA = Math.floor(wrapped);
  var t = wrapped - hourA;
  var hourB = (hourA % 12) + 1;
  var a = caseObj.clockHours[hourA];
  var b = caseObj.clockHours[hourB];
  function lerp(x, y) { return x + (y - x) * t; }
  return {
    depth: lerp(depthOf(a), depthOf(b)),
    pigment: lerp(a.pigment, b.pigment),
    bow: lerp(Gonio.CONTOUR_BOW[a.contour], Gonio.CONTOUR_BOW[b.contour]),
    pasStrength: lerp(a.pasBridge ? 1 : 0, b.pasBridge ? 1 : 0),
    vesselStrength: lerp(a.vessels ? 1 : 0, b.vessels ? 1 : 0),
    sampaolesiStrength: lerp(a.sampaolesi ? 1 : 0, b.sampaolesi ? 1 : 0)
  };
};

window.Gonio = Gonio;
