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
    name: "Fine iris processes",
    description: "Delicate, lacy uveal strands running from the peripheral iris across the posterior angle — found in many normal angles. They are fine and do not obscure the structures beneath, and unlike synechiae the angle still opens on indentation. Processes can sometimes bridge the recess, so it is indentation behaviour, not appearance alone, that separates them from a fixed adhesion.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    ),
    // the processes are in the atlas image itself, so nothing is drawn over it
  },

  /* --- Angle closure, graded --- */
  {
    id: "closure_g0", group: "Angle closure — Shaffer grade", disc: "atlas_closure_g0.png",
    name: "Grade 0 — Closed",
    description: "The deepest step of the authored grading sequence: no angle structure can be confidently identified (Shaffer 0, 0°). Read this plate honestly — vascular tissue obscures the superior, right and inferior sectors, and some landmarks survive on the left, so it is not a uniform appositional closure. Tilting will not open a closed angle; indentation is what separates appositional contact from adherent synechial closure, and until it is done the worst case is assumed.",
    clockHours: makeClockHours(
      { insertion: "closed", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "appositional" }
    )
  },
  {
    id: "closure_g1", group: "Angle closure — Shaffer grade", disc: "atlas_closure_g1.png",
    name: "Grade 1 — Very narrow",
    description: "An extremely narrow angle (Shaffer 1, ≤10°): the iris rises towards the pale outer bands, leaving only a thin posterior interval and hiding everything behind. Closure is probable. Tilt the lens toward the angle to see farther posteriorly. The grade here is the authored teaching designation for this sequence, not a measured angular approach.",
    clockHours: makeClockHours(
      { insertion: "schwalbe", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
    )
  },
  {
    id: "closure_g2", group: "Angle closure — Shaffer grade", disc: "atlas_closure_g2.png",
    name: "Grade 2 — Narrow",
    description: "A narrow angle (Shaffer 2, 20°): the posterior structures are far less exposed than in the open reference, though the anterior bands stay visible, so closure is possible. The spur and ciliary band are hidden by the iris convexity, which is why tilting brings them back. The grade is the authored teaching designation for this sequence, not a measured angular approach.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
    )
  },
  {
    id: "closure_g3", group: "Angle closure — Shaffer grade", disc: "disc.png",
    name: "Grade 3 — Open",
    description: "An open angle at 20–35° (Shaffer 3): the scleral spur is visible and closure is not a concern. Compare it against the wide-open angle — but grade on how far posteriorly you can see overall, not on absence of the ciliary body band alone, which varies with insertion and pigment.",
    clockHours: makeClockHours(
      { insertion: "spur", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "closure_g4", group: "Angle closure — Shaffer grade", disc: "atlas_closure_g4.png",
    masks: [{ rOut: 0.750 }, { rIn: 0.744 }],   // iris ends short of the band here
    name: "Grade 4 — Wide open",
    description: "A wide-open angle (Shaffer 4, 35–45°): the full breadth of the ciliary body face is in view all the way round. Set the width of that band against the normal angle — it is what marks an angle as wide open. Shaffer treats closure as impossible at this width, though that is a statement about primary appositional closure, not a guarantee against every mechanism.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- Mechanisms of closure --- */
  {
    id: "plateau", group: "Angle closure — mechanisms", disc: "disc.png",
    name: "Plateau iris",
    needsMaterial: "No confirmed plateau-iris exemplar is available, so the normal angle is shown here purely as a backdrop. Plateau iris is defined by its indentation behaviour and clinical context, which a single still image cannot demonstrate — read the description rather than the picture.",
    description: "A flat central iris with an abnormally anterior, abrupt insertion of the iris root, so the angle is uniformly narrow all the way round despite a deep central chamber. On indentation the peripheral iris gives the characteristic 'double hump' as it drapes over the anteriorly-rotated ciliary body. Unlike pupillary block it is not relieved by iridotomy alone.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false, closure: "optical" }
    )
  },
  {
    id: "nvg", group: "Angle closure — mechanisms", disc: "atlas_nvg.png",
    name: "Angle neovascularization",
    description: "Irregular red branching vessels crossing the peripheral iris and the posterior angle bands at several clock positions. They are told from normal angle vessels by following no radial or circumferential pattern and by crossing the spur. The angle is still open: the fibrovascular membrane they carry is invisible, but as it contracts it zips the angle closed, so this is the stage at which to catch it. Recognising the vessels is the skill here — calling it neovascular glaucoma additionally needs the pressure and the clinical picture.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: true, sampaolesi: false }
    )
  },
  {
    id: "uveitic", group: "Angle closure — mechanisms", disc: "atlas_uveitic.png",
    name: "Inferior white angle deposits",
    description: "Bright refractile white deposits clustered across the inferior iris-angle junction — the pattern seen when inflammatory debris settles under gravity, which is why the inferior angle is where to begin in uveitis. What the deposits are made of cannot be told from the image, and no synechiae are demonstrated here: look for those separately, and confirm them by indentation rather than by appearance.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the deposits are in the atlas image
  },

  /* --- Trabecular meshwork pigmentation --- */
  {
    id: "pig_mild", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_mild.png",
    name: "Light trabecular-region pigmentation",
    description: "An open angle whose anterior band is light, with fine red peripheral vessels also visible. Judge the meshwork on its own: the ciliary body band is naturally dark, and reading its darkness as trabecular pigment is the commonest way to over-grade an angle.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_moderate", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_moderate.png",
    name: "Light pigmentation with focal inferior granules",
    description: "Most of the angle bands are light, with a small cluster of granules inferiorly and some adjacent irregularity. The focal deposit is the feature worth finding here — this is not a clean example of evenly moderate pigment, so do not use it to calibrate a severity scale.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_heavy", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_heavy.png",
    name: "Granular trabecular-region pigmentation",
    description: "Dark irregular granules occupy the posterior part of the pale angle band all the way round. Pigment of this character can obscure the posterior meshwork; grade it by describing density and distribution, since the numeric scale is not calibrated against these illustrations.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pig_inferior", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_inferior.png",
    name: "Inferior-predominant granular pigmentation",
    description: "Fine dark granules increase through the inferior half and extend on to the peripheral iris. Pigment settles inferiorly under gravity and with aqueous circulation, which is the usual physiologic pattern and the reason the inferior angle is normally the most pigmented. Teach the distribution; the cause and an exact numeric grade are not determined by the picture.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      { 4: { pigment: 3 }, 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 }, 8: { pigment: 3 } }
    )   // the gradient is in the atlas image
  },
  {
    id: "pig_sectoral", group: "Trabecular meshwork pigmentation", disc: "atlas_pig_sectoral.png",
    name: "Sectoral inferior pigment deposits",
    description: "Coarse granules concentrated near 5 to 7 o'clock across a pale inferior angle, with an adjacent patch on the iris. Note that the deposits extend beyond the meshwork itself — a sectoral distribution like this is worth mapping right round the clock before calling it localized.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 } }
    )   // the patch is in the atlas image
  },
  {
    id: "melanocytosis", group: "Trabecular meshwork pigmentation", disc: "atlas_melanocytosis.png",
    name: "Dense diffuse angle pigmentation",
    description: "A very dark circumferential posterior band extending towards the peripheral iris — the density seen in melanocytic infiltration of the angle, as in oculodermal melanocytosis, where the angle deserves a careful look. Pigment alone does not make that diagnosis: it needs the accompanying ocular or skin findings.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 4, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the finding is in the atlas image
  },

  /* --- Trauma --- */
  {
    id: "angle_recession", group: "Trauma", disc: "atlas_angle_recession.png",
    name: "Angle recession",
    description: "A post-traumatic tear in the face of the ciliary body, here involving one inferior sector: a widened grey ciliary body face with the iris inserting in a step further back, while the anterior landmarks run on uninterrupted. Travel the full 360° — the extent of involvement is what matters, and a minority of these eyes go on to glaucoma, often years after the injury. Comparison with the fellow eye and a history of blunt trauma are what confirm it.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the recessed sector is in the atlas image
  },
  {
    id: "pas", group: "Angle closure — mechanisms", disc: "atlas_pas.png",
    name: "Broad iris bridges — processes or PAS",
    description: "Broad superior iris-to-angle bridges that branch posteriorly and interrupt the normal junction, with a second group temporally around 9 to 10. Map their extent right round the clock, since that is what decides how much functioning angle is left. Whether these are broad iris processes or true synechiae cannot be settled from a still image: a genuine adhesion stays closed on tilting and indentation, so compare them against the fine-processes case and confirm dynamically.",
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
    id: "pigment_dispersion", group: "Material in the angle", disc: "disc.png",
    name: "Pigment dispersion syndrome",
    needsMaterial: "The plate previously shown here was the same image as the angle-recession case, so it has been withdrawn; the normal angle stands in as a neutral backdrop. Use the pigmentation cases to practise reading pigment, and read the description here rather than the picture.",
    description: "A wide-open angle with dense, homogeneous black pigment in the posterior trabecular meshwork and a Sampaolesi line. The mid-peripheral iris is concave (posterior bowing against the zonules). Classically a young, myopic patient.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "concave", pigment: 4, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "pseudoexfoliation", group: "Material in the angle", disc: "atlas_pseudoexfoliation.png",
    name: "Coarse clumped angle pigmentation",
    description: "Large irregular dark clumps lining the angle with deposits on the inferior iris. Pigment that is clumped and uneven like this — rather than the smooth homogeneous band of pigment dispersion — is the pattern that accompanies pseudoexfoliation in an older patient. The pattern is compatible with it, but no exfoliative material is demonstrated here, so look to the pupil margin and lens capsule to make that diagnosis.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "blood_schlemm", group: "Material in the angle", disc: "atlas_blood_schlemm.png",
    name: "Circumferential red canal-like line",
    description: "A narrow, unbranched red line following the posterior trabecular region with no free blood level below it. Blood refluxed into Schlemm's canal looks like this, and is seen when episcleral venous pressure exceeds IOP (carotid-cavernous or dural-sinus fistula, Sturge-Weber), with ocular hypotony, or as an artefact of firm lens pressure. The reading holds only if the line sits anterior to the scleral spur — check that before calling it canal blood, and separate it from a dependent hyphema, which layers.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "cyclodialysis", group: "Trauma", disc: "atlas_cyclodialysis.png",
    name: "Cyclodialysis cleft",
    description: "A focal dis-insertion of the ciliary body from the scleral spur — here a narrow dark slit lying behind a pale spur-like ledge in the inferior angle, with the iris otherwise continuous. Aqueous escapes freely to the suprachoroidal space, so unlike angle recession this one runs a low IOP. Spin round to find the cleft; it may be only a fraction of a clock hour wide. A deep posterior slit like this is not the same as a red canal line — and examination or UBM is what confirms it.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the cleft is in the atlas image
  },
  {
    id: "iridodialysis", group: "Trauma", disc: "atlas_iridodialysis.png",
    name: "Iridodialysis",
    description: "A traumatic tear of the iris root away from the ciliary body — here a ragged full-thickness defect in the inferior angle exposing dark lobulated tissue behind. The iris is thinnest at its insertion, which is why it gives way here. Keep it distinct from a cyclodialysis cleft, where it is the ciliary body that has disinserted rather than the iris root. It flags substantial blunt trauma, so look carefully for accompanying angle recession. The rendered edges here are exaggerated.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the tear is in the atlas image
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
    id: "posterior_embryotoxon", group: "Developmental", disc: "atlas_posterior_embryotoxon.png",
    name: "Prominent anterior angle line",
    description: "A conspicuous pale line running round the anterior edge of an open angle. A prominent, anteriorly-displaced Schwalbe's line looks like this — posterior embryotoxon — and is a common normal variant on its own; when florid and accompanied by iris strands bridging to it, it becomes part of the Axenfeld-Rieger spectrum. That the line is genuinely displaced forward cannot be established from this view, so treat embryotoxon as the leading differential rather than a settled call.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },

  /* --- After laser & surgery --- */
  {
    id: "laser_trabeculoplasty", group: "After laser & surgery", disc: "atlas_laser.png",
    name: "Patchy pale angle material",
    needsMaterial: "This plate shows nonspecific pale material and strands, not the discrete evenly-spaced burn scars of trabeculoplasty. It is kept for reading pale angle material; it is not a canonical post-laser example, so do not use it to practise recognising the procedure.",
    description: "Pale material and small strands extending around much of the angle. After trabeculoplasty one instead looks for discrete burn scars spaced evenly along the anterior pigmented meshwork: knowing how much angle has already been treated matters when planning further laser, and gonioscopy is the only way to see it.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false }
    )
    // the finding is in the atlas image
  },
  {
    id: "postsurgical_pigment", group: "After laser & surgery", disc: "atlas_postsurgical_pigment.png",
    name: "Patchy coarse angle pigmentation",
    description: "Dark clumps varying round the circumference, heaviest inferiorly and to the left, where pigment settles. Scattered pigment like this follows intraocular surgery or laser — peripheral iridotomy is a particularly common cause of new inferior angle pigment — but the picture shows only the pigment; attributing it to surgery needs the history.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 3, pasBridge: false, vessels: false, sampaolesi: false },
      { 5: { pigment: 4 }, 6: { pigment: 4 }, 7: { pigment: 4 } }
    )
    // the finding is in the atlas image
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
