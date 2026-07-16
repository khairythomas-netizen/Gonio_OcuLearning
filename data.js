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

/* ---- Training cases ---- */
Gonio.CASES = [
  {
    id: "normal",
    name: "Normal open angle",
    description: "A healthy angle: wide open all the way round, mild trabecular pigment, no synechiae.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "pacg",
    name: "Primary angle closure (narrow angle)",
    description: "A crowded angle that is narrowest superiorly, with a few clock hours of chronic synechial closure.",
    clockHours: makeClockHours(
      { insertion: "tm_p", contour: "convex", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false },
      {
        11: { insertion: "schwalbe", contour: "convex", pasBridge: true },
        12: { insertion: "schwalbe", contour: "convex", pasBridge: true },
        1:  { insertion: "schwalbe", contour: "convex", pasBridge: false },
        6:  { insertion: "tm_np", contour: "convex" }
      }
    )
  },
  {
    id: "pds",
    name: "Pigment dispersion syndrome",
    description: "Wide open, concave (myopic) iris configuration with dense, homogeneous trabecular pigmentation and a Sampaolesi line.",
    clockHours: makeClockHours(
      { insertion: "cb", contour: "concave", pigment: 4, pasBridge: false, vessels: false, sampaolesi: true }
    )
  },
  {
    id: "nvg",
    name: "Neovascular glaucoma",
    description: "Fine new vessels crossing the angle structures with patchy synechial closure.",
    clockHours: makeClockHours(
      { insertion: "spur", contour: "flat", pigment: 2, pasBridge: false, vessels: true, sampaolesi: false },
      {
        3:  { insertion: "schwalbe", pasBridge: true, vessels: true },
        4:  { insertion: "schwalbe", pasBridge: true, vessels: true },
        9:  { insertion: "tm_p", vessels: true }
      }
    )
  },
  {
    id: "plateau",
    name: "Plateau iris syndrome",
    description: "A uniformly narrow angle with a flat central iris but an abrupt anterior insertion peripherally.",
    clockHours: makeClockHours(
      { insertion: "schwalbe", contour: "flat", pigment: 1, pasBridge: false, vessels: false, sampaolesi: false }
    )
  },
  {
    id: "chronic_pas",
    name: "Chronic angle closure with PAS",
    description: "Mixed angle grades with prominent peripheral anterior synechiae bridging several clock hours.",
    clockHours: makeClockHours(
      { insertion: "tm_np", contour: "convex", pigment: 2, pasBridge: false, vessels: false, sampaolesi: false },
      {
        2:  { pasBridge: true, insertion: "schwalbe" },
        3:  { pasBridge: true, insertion: "schwalbe" },
        7:  { pasBridge: true, insertion: "schwalbe" },
        8:  { insertion: "tm_p" }
      }
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
