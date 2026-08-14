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
  "Angle closure — mechanisms",
  "Trabecular meshwork pigmentation",
  "Material in the angle",
  "Trauma",
  "Developmental",
  "After laser & surgery"
];

Gonio.CASES = [
  {
    id: "normal", group: null, disc: "disc.png",
    name: "Normal open angle",
    description: "A healthy open angle, with the ciliary body band visible all the way round. Pigment still varies with the clock — heaviest inferiorly, where it settles under gravity — so every quadrant is worth examining.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 2 }, 6: { pigment: 2 }, 7: { pigment: 2 } }   // settles inferiorly
    ),
    sectors: [{ type: "pigment", from: 4.6, to: 7.4, strength: 0.42 }]
  },
  {
    id: "iris_processes", group: null, disc: "atlas_iris_processes.png",
    name: "Iris processes (normal variant)",
    description: "Delicate, lacy uveal strands running from the iris root on to the meshwork — found in many normal angles. Unlike synechiae they are fine, they follow the concavity of the recess rather than bridging it, they do not obscure the structures beneath, and they move freely on indentation.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    // the processes are in the atlas image itself, so nothing is drawn over it
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
    id: "closure_g3", group: "Angle closure — Shaffer grade", disc: "disc.png",
    name: "Grade 3 — Open",
    masksDownTo: 1,          // keep the ciliary band labelable — this disc shows it
    description: "An open angle at 20–35°, where the scleral spur is the deepest landmark you would routinely call (Shaffer 3); closure is impossible. Only a narrow strip of ciliary body face shows here — set it against the wide-open angle, where the band is unmistakably broad.",
    clockHours: makeClockHours(
      { insertion: "spur", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g4", group: "Angle closure — Shaffer grade", disc: "wide_open.png",
    // this disc's dark ciliary band sits further in, and is broader
    masks: [{ rOut: 0.760 }, { rIn: 0.752 }],
    name: "Grade 4 — Wide open",
    description: "A wide-open angle — the full width of the ciliary body band is visible all the way round (Shaffer 4, 35–45°). Compare the band here with the narrower one in the normal angle: this breadth of ciliary body face is what marks the angle as wide open.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- Mechanisms of closure --- */
  {
    id: "plateau", group: "Angle closure — mechanisms", disc: "disc.png",
    name: "Plateau iris",
    description: "A flat central iris with an abnormally anterior, abrupt insertion of the iris root, so the angle is uniformly narrow all the way round despite a deep central chamber. On indentation the peripheral iris gives the characteristic 'double hump' as it drapes over the anteriorly-rotated ciliary body. Unlike pupillary block it is not relieved by iridotomy alone.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
    ),
    sectors: [{ type: "pas", from: 0, to: 12, reach: 2, strength: 0.5 }]
  },
  {
    id: "nvg", group: "Angle closure — mechanisms", disc: "atlas_nvg.png",
    name: "Neovascular glaucoma",
    description: "Fine new vessels branching across the ciliary body band and scleral spur on to the meshwork, seen here around 12, 4 and 9 o'clock. They are told from normal angle vessels by following no radial or circumferential pattern and by crossing the spur. The angle is still open: the fibrovascular membrane they carry is invisible, but as it contracts it zips the angle closed, so this is the stage at which to catch it.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: true, sampaolesi: false }
    )
  },
  {
    id: "uveitic", group: "Angle closure — mechanisms", disc: "disc.png",
    name: "Uveitic angle with inflammatory PAS",
    description: "Inflammatory precipitates sitting on the trabecular meshwork, heaviest inferiorly where debris settles, with broad synechiae where chronic inflammation has consolidated and dragged the iris on to the meshwork. In uveitis begin with the inferior angle — that is where the debris collects and the synechiae form.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pasBridge: true, insertion: "tm_p", closure: "synechial" },
        6: { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        7: { pasBridge: true, insertion: "tm_p", closure: "synechial" } }
    ),
    sectors: [
      { type: "pas", from: 4.7, to: 7.3, reach: 3 },
      { type: "kp", from: 3.2, to: 8.8, density: 11, seed: 33 }
    ]
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
    id: "pig_heavy", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_heavy.png",
    name: "Heavy pigmentation",
    description: "Wide-open angle with heavy, dense pigment (3–4+) forming a smooth brown-black band that can obscure the posterior meshwork.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_inferior", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_inferior.png",
    name: "Inferior-predominant",
    description: "Wide-open angle; pigment settles most heavily in the inferior meshwork from gravity and aqueous circulation — the usual physiologic pattern (in narrow angles pigment can instead be heavier superiorly).",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      { 4: { pigment: 3 }, 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 }, 8: { pigment: 3 } }
    )   // the gradient is in the atlas image
  },
  {
    id: "pig_sectoral", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_sectoral.png",
    name: "Sectoral inferior",
    description: "Wide-open angle with a localized band of heavy inferior trabecular pigment.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 } }
    )   // the patch is in the atlas image
  },
  {
    id: "melanocytosis", group: "Trabecular meshwork pigmentation", disc: "pig_heavy.png",
    name: "Oculodermal melanocytosis",
    description: "Melanocytic infiltration of the angle: the meshwork is densely pigmented and partly obscured by unusually abundant, heavily pigmented iris processes, and the ciliary body band is generally dark. Glaucoma occurs in about 10%, so the angle deserves a careful look in anyone with melanosis oculi.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "processes", from: 0, to: 12, density: 11, dark: true, seed: 66 }]
  },

  /* --- Trauma --- */
  {
    id: "angle_recession", group: "Trauma", disc: "angle_recession.png",
    name: "Angle recession",
    description: "A post-traumatic tear in the face of the ciliary body, here involving one segment: an abnormally wide, pale ciliary body band and a deep recess, with torn iris processes and a whiter-looking scleral spur. Travel the full 360° — the extent of involvement is what matters, and glaucoma follows in about 9%.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "pale", from: 6.8, to: 10.2, strength: 0.9 }]
  },
  {
    id: "pas", group: "Angle closure — mechanisms", disc: "atlas_pas.png",
    name: "Peripheral anterior synechiae",
    description: "Broad tented synechiae bridging the recess up on to the meshwork at 12 o'clock — the usual site after angle closure — with a second group temporally around 9 to 10. Travel round the clock to map their extent, since that is what decides how much functioning angle is left. Being adherent, they stay closed on tilting or indentation, which is exactly what separates them from appositional closure.",
    // matched to where the tents actually sit in the atlas image
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 12: { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        9:  { pasBridge: true, insertion: "schwalbe", closure: "synechial" },
        10: { pasBridge: true, insertion: "tm_p",     closure: "synechial" },
        11: { insertion: "spur" }, 1: { insertion: "spur" } }
    )
  },
  {
    id: "pigment_dispersion", group: "Material in the angle", disc: "pigment_dispersion.png",
    name: "Pigment dispersion syndrome",
    description: "A wide-open angle with dense, homogeneous black pigment in the posterior trabecular meshwork and a Sampaolesi line. The mid-peripheral iris is concave (posterior bowing against the zonules). Classically a young, myopic patient.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "concave", pigment: 4, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "pseudoexfoliation", group: "Material in the angle", disc: "pseudoexfoliation.png",
    name: "Pseudoexfoliation syndrome",
    description: "A wide-open angle with granular, clumped brown trabecular pigment (less homogeneous than pigment dispersion), a line along Schwalbe's plus a wavy Sampaolesi line, and flecks of pseudoexfoliation material. Typically an elderly patient.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "blood_schlemm", group: "Material in the angle", disc: "blood_schlemm.png",
    name: "Blood in Schlemm's canal",
    description: "Blood refluxed into Schlemm's canal — a red band in the posterior trabecular meshwork, seen when episcleral venous pressure exceeds IOP (carotid-cavernous or dural-sinus fistula, Sturge-Weber) or with ocular hypotony. Can also be an artefact of firm lens pressure.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "cyclodialysis", group: "Trauma", disc: "cyclodialysis.png",
    name: "Cyclodialysis cleft",
    description: "A focal dis-insertion of the ciliary body from the scleral spur — a very deep cleft through which bare white sclera is visible. Aqueous escapes freely to the suprachoroidal space, so unlike angle recession this one runs a low IOP. Spin round to find the cleft; it may be only a fraction of a clock hour wide.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "pale", from: 3.9, to: 4.7, strength: 1 }]
  },
  {
    id: "iridodialysis", group: "Trauma", disc: "disc.png",
    name: "Iridodialysis",
    description: "A traumatic tear of the iris root away from the ciliary body, leaving a dark gap through which the ciliary processes are directly visible. The iris is thinnest at its insertion, which is why it gives way here. It flags substantial blunt trauma — look carefully for accompanying angle recession.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "dialysis", from: 7.6, to: 8.9, seed: 5 }]
  },
  {
    id: "hyphema", group: "Trauma", disc: "atlas_hyphema.png",
    name: "Hyphema in the angle",
    description: "Blood in the anterior chamber settles into the inferior angle under gravity and lies on the trabecular meshwork. Small amounts are visible only on gonioscopy and rarely raise the pressure; a large hyphema filling the meshwork does. Small pigment balls may persist in the angle long after it clears.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )   // the layered blood is in the atlas image, pooled at 5 to 7
  },

  /* --- Developmental --- */
  {
    id: "posterior_embryotoxon", group: "Developmental", disc: "posterior_embryotoxon.png",
    name: "Posterior embryotoxon",
    description: "A prominent, anteriorly-displaced Schwalbe's line standing forward as a white ridge, most often inferiorly. A common normal variant; when florid and accompanied by prominent iris strands bridging to it, it becomes part of the Axenfeld-Rieger spectrum.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- After laser & surgery --- */
  {
    id: "laser_trabeculoplasty", group: "After laser & surgery", disc: "pig_moderate.png",
    name: "After laser trabeculoplasty",
    description: "Discrete burn scars spaced evenly along the anterior pigmented meshwork, here treated over the inferior 180°. Knowing the extent already treated matters when planning further laser, and gonioscopy is the only way to see it.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "laser", from: 3, to: 9, density: 7, seed: 8 }]
  },
  {
    id: "migs_stent", group: "After laser & surgery", disc: "disc.png",
    name: "MIGS stent in the angle",
    description: "A trabecular bypass stent seated across the meshwork nasally, where Schlemm's canal and the collector channels are richest. Gonioscopy confirms the device is correctly positioned in the meshwork and not buried in iris or sitting free in the chamber — the reason intraoperative and post-operative gonioscopy matters in the MIGS era.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    sectors: [{ type: "stent", from: 2.75, to: 3.25 }]
  },
  {
    id: "postsurgical_pigment", group: "After laser & surgery", disc: "pig_inferior.png",
    name: "Pigment after intraocular surgery",
    description: "Scattered pigment throughout the angle following intraocular surgery or laser, densest inferiorly where it settles. Laser peripheral iridotomy is a particularly common cause of new inferior angle pigment.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 } }
    ),
    sectors: [{ type: "pigment", from: 3.6, to: 8.4, strength: 0.75 }]
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
