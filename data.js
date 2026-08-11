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

/* ---- Shaffer grading: what the deepest visible structure is ----
   Angle widths and closure risk per Shaffer (Alward, Color Atlas of
   Gonioscopy, Table 1). */
Gonio.SHAFFER = [
  { grade: 4, range: "35–45°", deepestVisible: "cb",       label: "Wide open",        risk: "Closure impossible", note: "Ciliary body band visible." },
  { grade: 3, range: "20–35°", deepestVisible: "spur",     label: "Open",             risk: "Closure impossible", note: "Scleral spur visible, ciliary body band not seen." },
  { grade: 2, range: "20°",    deepestVisible: "tm_p",     label: "Narrow",           risk: "Closure possible",   note: "Trabecular meshwork visible, scleral spur not seen." },
  { grade: 1, range: "≤10°",   deepestVisible: "schwalbe", label: "Extremely narrow", risk: "Closure probable",   note: "Only Schwalbe's line visible." },
  { grade: 0, range: "0°",     deepestVisible: null,       label: "Closed",           risk: "Closed",             note: "Iridotrabecular contact; no angle structures visible (appositional or synechial)." }
];

/* maps an iris-insertion landmark to its Shaffer grade + approx degrees and
   Spaeth insertion letter (A anterior to Schwalbe's, B behind Schwalbe's onto
   the meshwork, C posterior to the scleral spur, D deep into the ciliary body
   face, E extremely deep). Used to draw + grade the angle. */
Gonio.INSERTION_INFO = {
  cb:       { grade: 4, degrees: 40, spaethLetter: "D" },
  spur:     { grade: 3, degrees: 28, spaethLetter: "C" },
  tm_p:     { grade: 2, degrees: 20, spaethLetter: "B" },
  tm_np:    { grade: 2, degrees: 20, spaethLetter: "B" },
  schwalbe: { grade: 1, degrees: 10, spaethLetter: "B" },
  closed:   { grade: 0, degrees: 0,  spaethLetter: "A" }
};

/* Spaeth peripheral-iris contour codes: r regular/flat, s steep/convex,
   q queer/concave (Alward, Color Atlas of Gonioscopy, Ch. 6). */
Gonio.CONTOUR_CODES = {
  flat:    { code: "r", label: "Regular / flat" },
  convex:  { code: "s", label: "Steep / convex" },
  concave: { code: "q", label: "Queer / concave" }
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

/* ---- how a closed/narrow angle is closed --------------------------------
   Determines which manoeuvres open the view (Bayer & Spaeth, "Slit Lamp
   Gonioscopy Technique, Including Indentation Gonioscopy"):
     optical      – the angle is open but the convex peripheral iris hides the
                    structures; tilting the lens toward the angle (or having the
                    patient gaze toward the mirror) brings them into view.
     appositional – iris rests against the meshwork with no adhesions; tilting
                    does not help, indentation does.
     synechial    – peripheral anterior synechiae; adherent and fixed, so
                    neither tilting nor indentation opens it.  */
Gonio.CLOSURE_TYPES = {
  optical:      { label: "Optical (iris obscures the view)", opensWithTilt: true },
  appositional: { label: "Appositional (iris touching, not adherent)", opensWithTilt: false },
  synechial:    { label: "Synechial (PAS — adherent)", opensWithTilt: false }
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
    description: "A healthy open angle. Note the normal variation around the clock: the inferior angle is widest and most heavily pigmented, the lateral quadrants are narrower, and the superior angle is narrowest — which is why every quadrant must be examined.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      {  // superior angle normally narrowest, inferior widest and most pigmented
        11: { insertion: "spur" }, 12: { insertion: "spur" }, 1: { insertion: "spur" },
        5:  { pigment: 2 }, 6: { pigment: 2 }, 7: { pigment: 2 }
      }
    ),
    sectors: [{ type: "pigment", from: 4.6, to: 7.4, strength: 0.42 }]
  },

  /* --- Angle closure, graded --- */
  {
    id: "closure_g0", group: "Angle closure — Shaffer grade", disc: "closure_g0.png",
    name: "Grade 0 — Closed",
    description: "Iridotrabecular contact all the way round — no angle structures visible (Shaffer 0). Tilting the lens will not open this view: indentation gonioscopy is needed to tell appositional closure from adherent synechial closure, and the worst case should be assumed until it does.",
    clockHours: makeClockHours(
      { insertion: "closed", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "appositional" }
    )
  },
  {
    id: "closure_g1", group: "Angle closure — Shaffer grade", disc: "closure_g1.png",
    name: "Grade 1 — Very narrow",
    description: "An extremely narrow angle — only Schwalbe's line is seen (Shaffer 1), the convex peripheral iris hiding everything behind it. Closure is probable. Tilt the lens toward the angle to see farther posteriorly and reveal the meshwork.",
    clockHours: makeClockHours(
      { insertion: "schwalbe", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
    )
  },
  {
    id: "closure_g2", group: "Angle closure — Shaffer grade", disc: "closure_g2.png",
    name: "Grade 2 — Narrow",
    description: "A narrow angle — seen down to the pigmented meshwork but not the scleral spur (Shaffer 2); closure is possible. The spur and ciliary body band are hidden by the iris convexity, so tilting the lens brings them into view.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
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
    description: "Wide-open angle with light, even pigment in the posterior trabecular meshwork (1+).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_moderate", group: "Trabecular meshwork pigmentation", disc: "pig_moderate.png",
    name: "Moderate pigmentation",
    description: "Wide-open angle with moderate, even pigment in the posterior trabecular meshwork (2+).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_heavy", group: "Trabecular meshwork pigmentation", disc: "pig_heavy.png",
    name: "Heavy pigmentation",
    description: "Wide-open angle with heavy, dense pigment (3–4+) forming a smooth brown-black band that can obscure the posterior meshwork.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_inferior", group: "Trabecular meshwork pigmentation", disc: "pig_inferior.png",
    name: "Inferior-predominant",
    description: "Wide-open angle; pigment settles most heavily in the inferior meshwork from gravity and aqueous circulation — the usual physiologic pattern (in narrow angles pigment can instead be heavier superiorly).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      { 4: { pigment: 3 }, 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 }, 8: { pigment: 3 } }
    ),
    sectors: [{ type: "pigment", from: 3.8, to: 8.2, strength: 0.8 }]
  },
  {
    id: "pig_sectoral", group: "Trabecular meshwork pigmentation", disc: "pig_sectoral.png",
    name: "Sectoral inferior",
    description: "Wide-open angle with a localized band of heavy inferior trabecular pigment.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 6: { pigment: 4 }, 7: { pigment: 4 } }
    ),
    sectors: [{ type: "pigment", from: 5.6, to: 7.4, strength: 1 }]
  },

  /* --- Other findings --- */
  {
    id: "angle_recession", group: "Other findings", disc: "angle_recession.png",
    name: "Angle recession",
    description: "A post-traumatic tear in the face of the ciliary body, here involving one segment: an abnormally wide, pale ciliary body band and a deep recess, with torn iris processes and a whiter-looking scleral spur. Travel the full 360° — the extent of involvement is what matters, and glaucoma follows in about 9%.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "pale", from: 6.8, to: 10.2, strength: 0.9 }]
  },
  {
    id: "pas", group: "Other findings", disc: "pas.png",
    name: "Peripheral anterior synechiae",
    description: "Broad synechiae bridging the recess up on to the meshwork in the superior angle — the usual site after angle closure — with a separate discrete adhesion nasally. Travel round the clock to map their extent. Being adherent, they stay closed on tilting or indentation, which is what distinguishes them from appositional closure.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 11: { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        12: { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        1:  { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        3:  { pasBridge: true, insertion: "tm_p",     closure: "synechial" },
        10: { insertion: "spur" }, 2: { insertion: "spur" } }
    ),
    sectors: [
      { type: "pas", from: 10.7, to: 13.3, reach: 4 },   // broad superior synechiae
      { type: "pas", from: 2.75, to: 3.25, reach: 3 }    // discrete nasal adhesion
    ]
  },
  {
    id: "pigment_dispersion", group: "Other findings", disc: "pigment_dispersion.png",
    name: "Pigment dispersion syndrome",
    description: "A wide-open angle with dense, homogeneous black pigment in the posterior trabecular meshwork and a Sampaolesi line. The mid-peripheral iris is concave (posterior bowing against the zonules). Classically a young, myopic patient.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "concave", pigment: 4, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "pseudoexfoliation", group: "Other findings", disc: "pseudoexfoliation.png",
    name: "Pseudoexfoliation syndrome",
    description: "A wide-open angle with granular, clumped brown trabecular pigment (less homogeneous than pigment dispersion), a line along Schwalbe's plus a wavy Sampaolesi line, and flecks of pseudoexfoliation material. Typically an elderly patient.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "blood_schlemm", group: "Other findings", disc: "blood_schlemm.png",
    name: "Blood in Schlemm's canal",
    description: "Blood refluxed into Schlemm's canal — a red band in the posterior trabecular meshwork, seen when episcleral venous pressure exceeds IOP (carotid-cavernous or dural-sinus fistula, Sturge-Weber) or with ocular hypotony. Can also be an artefact of firm lens pressure.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "cyclodialysis", group: "Other findings", disc: "cyclodialysis.png",
    name: "Cyclodialysis cleft",
    description: "A focal dis-insertion of the ciliary body from the scleral spur — a very deep cleft through which bare white sclera is visible. Aqueous escapes freely to the suprachoroidal space, so unlike angle recession this one runs a low IOP. Spin round to find the cleft; it may be only a fraction of a clock hour wide.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "pale", from: 3.9, to: 4.7, strength: 1 }]
  },
  {
    id: "posterior_embryotoxon", group: "Other findings", disc: "posterior_embryotoxon.png",
    name: "Posterior embryotoxon",
    description: "A prominent, anteriorly-displaced Schwalbe's line standing forward as a white ridge, most often inferiorly. A common normal variant; when florid with prominent iris processes it may be part of the Axenfeld-Rieger spectrum.",
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
