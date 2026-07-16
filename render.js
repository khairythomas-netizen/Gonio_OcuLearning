/* Gonioscopy Simulator — SVG rendering of the angle view + dial
   Style: dark vignette, a glowing slit beam, and ONE continuous curved
   gradient "tube" for the angle structures (not discrete flat tiles) so
   rotation and grade changes read as smooth, continuous motion. */

var Gonio = window.Gonio || {};

var NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  var el = document.createElementNS(NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/* Local geometry (world coords at the "hour 12" / unrotated orientation).
   The whole assembly rotates around PIVOT as the clock hour changes. */
var PIVOT = { x: 300, y: 200 };
var CORNEA_END = { x: 250, y: 120 };
var CURVE_CTRL = { x: 300, y: 105 };
var CB_END = { x: 430, y: 195 };
var PUPIL_POINT = { x: 150, y: 330 };

/* segment boundaries along the curve, t in [0,1], anterior -> posterior */
var SEG_BOUNDS = [
  { id: "schwalbe", from: 0.0, to: 0.2, fill: "#d8c380" },
  { id: "tm_np", from: 0.2, to: 0.4, fill: "#a9c2c9" },
  { id: "tm_p", from: 0.4, to: 0.6, fill: null },
  { id: "spur", from: 0.6, to: 0.8, fill: "#efe6cf" },
  { id: "cb", from: 0.8, to: 1.0, fill: "#6b5546" }
];

function quadPoint(p0, p1, p2, t) {
  var mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

function curveD() {
  return "M " + CORNEA_END.x + " " + CORNEA_END.y +
    " Q " + CURVE_CTRL.x + " " + CURVE_CTRL.y + " " + CB_END.x + " " + CB_END.y;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function lerpColor(c1, c2, f) {
  var a = hexToRgb(c1), b = hexToRgb(c2);
  return "rgb(" + Math.round(a.r + (b.r - a.r) * f) + "," +
    Math.round(a.g + (b.g - a.g) * f) + "," +
    Math.round(a.b + (b.b - a.b) * f) + ")";
}

function pigmentColor(gradeFloat) {
  var stops = ["#e9dcc4", "#c99a5c", "#a06a2e", "#7a4a1e", "#4a2a10"];
  var g = clamp(gradeFloat, 0, 4);
  var i0 = Math.floor(g), i1 = Math.min(4, i0 + 1), f = g - i0;
  return lerpColor(stops[i0], stops[i1], f);
}

/* continuous blend of the old convex/flat/concave control-point rules; bow: -1 concave .. 0 flat .. 1 convex */
function irisControlPoint(insertionPt, bow) {
  var avgX = (PUPIL_POINT.x + insertionPt.x) / 2;
  var avgY = (PUPIL_POINT.y + insertionPt.y) / 2;
  var convexAmt = Math.max(0, bow);
  var concaveAmt = Math.max(0, -bow);
  return {
    x: avgX + concaveAmt * 20,
    y: avgY + 10 - convexAmt * 100 + concaveAmt * 30
  };
}

function ensureDefs(svg) {
  var defs = svgEl("defs", {});

  var vignette = svgEl("radialGradient", { id: "gonioVignette", cx: "50%", cy: "48%", r: "75%" });
  vignette.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#211a13" }));
  vignette.appendChild(svgEl("stop", { offset: "55%", "stop-color": "#0c0906" }));
  vignette.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#000000" }));
  defs.appendChild(vignette);

  var fundus = svgEl("radialGradient", { id: "gonioFundus", cx: "50%", cy: "50%", r: "50%" });
  fundus.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#ff8a3d", "stop-opacity": "0.9" }));
  fundus.appendChild(svgEl("stop", { offset: "45%", "stop-color": "#c9541f", "stop-opacity": "0.5" }));
  fundus.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#000000", "stop-opacity": "0" }));
  defs.appendChild(fundus);

  var beam = svgEl("linearGradient", { id: "gonioBeam", x1: "0", y1: "0", x2: "1", y2: "0" });
  beam.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#eaf6ff", "stop-opacity": "0" }));
  beam.appendChild(svgEl("stop", { offset: "45%", "stop-color": "#eaf6ff", "stop-opacity": "0.85" }));
  beam.appendChild(svgEl("stop", { offset: "55%", "stop-color": "#eaf6ff", "stop-opacity": "0.85" }));
  beam.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#eaf6ff", "stop-opacity": "0" }));
  defs.appendChild(beam);

  var glow = svgEl("filter", { id: "gonioGlow", x: "-60%", y: "-60%", width: "220%", height: "220%" });
  glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "6" }));
  defs.appendChild(glow);

  var softGlow = svgEl("filter", { id: "gonioSoftGlow", x: "-60%", y: "-60%", width: "220%", height: "220%" });
  softGlow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "2.5" }));
  defs.appendChild(softGlow);

  var clip = svgEl("clipPath", { id: "gonioClip" });
  clip.appendChild(svgEl("circle", { cx: PIVOT.x, cy: PIVOT.y, r: 185 }));
  defs.appendChild(clip);

  svg.appendChild(defs);
}

/* Renders the current continuous state into the given <svg> (cleared first).
   caseObj + continuousHour drive a smooth blend; opts.clickableStructures
   enables quiz hit-testing on the visible portion of the curve. */
Gonio.renderAngle = function (svg, caseObj, continuousHour, opts) {
  opts = opts || {};
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  ensureDefs(svg);

  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 600, height: 400, fill: "url(#gonioVignette)" }));
  svg.appendChild(svgEl("ellipse", { cx: 300, cy: 230, rx: 210, ry: 130, fill: "url(#gonioFundus)" }));

  var vs = Gonio.visualState(caseObj, continuousHour);
  var beamAngle = (Gonio.wrapHour(continuousHour) % 12) / 12 * 360;

  var clipWrapper = svgEl("g", { "clip-path": "url(#gonioClip)" });
  svg.appendChild(clipWrapper);
  var group = svgEl("g", { transform: "rotate(" + beamAngle + " " + PIVOT.x + " " + PIVOT.y + ")" });
  clipWrapper.appendChild(group);

  // slit beam glow, decorative + non-interactive
  var beamGroup = svgEl("g", { style: "pointer-events:none; mix-blend-mode: screen" });
  beamGroup.appendChild(svgEl("rect", {
    x: PIVOT.x - 55, y: -80, width: 110, height: 560,
    fill: "url(#gonioBeam)", filter: "url(#gonioGlow)", opacity: 0.7
  }));
  beamGroup.appendChild(svgEl("rect", {
    x: PIVOT.x - 14, y: -80, width: 28, height: 560,
    fill: "url(#gonioBeam)", opacity: 0.9
  }));
  group.appendChild(beamGroup);

  var d = curveD();
  var measurePath = svgEl("path", { d: d, opacity: 0 });
  group.appendChild(measurePath);
  var L = measurePath.getTotalLength();

  var insertionT = clamp(vs.depth / 5, 0, 1);

  // the continuous colored tube, drawn as stacked dash-revealed copies of the same curve
  SEG_BOUNDS.forEach(function (seg) {
    var fill = seg.fill || pigmentColor(vs.pigment);
    var segLen = (seg.to - seg.from) * L;
    var el = svgEl("path", {
      d: d,
      fill: "none",
      stroke: fill,
      "stroke-width": 26,
      "stroke-linecap": "butt",
      "stroke-dasharray": segLen + " " + (L - segLen + 1),
      "stroke-dashoffset": -(seg.from * L),
      "data-structure": seg.id,
      class: "angle-structure" + (opts.clickableStructures ? " clickable" : "")
    });
    group.appendChild(el);
  });

  // unifying specular highlight along the whole curve
  group.appendChild(svgEl("path", {
    d: d, fill: "none", stroke: "#ffffff", "stroke-width": 5, "stroke-linecap": "round",
    opacity: 0.3, style: "pointer-events:none; mix-blend-mode: screen"
  }));

  // iris: covers the curve from the insertion point to the posterior end, then sweeps to the pupil
  var insertionPt = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, insertionT);
  var irisMid = irisControlPoint(insertionPt, vs.bow);
  var irisD = "M " + PUPIL_POINT.x + " " + PUPIL_POINT.y +
    " Q " + irisMid.x + " " + irisMid.y + " " + insertionPt.x + " " + insertionPt.y;

  // sample a slightly outward-offset curve so the cover shape fully occludes
  // the tube's stroke width (26px), not just its zero-width centerline
  var OUTWARD = 15;
  var oCornea = { x: CORNEA_END.x, y: CORNEA_END.y - OUTWARD };
  var oCtrl = { x: CURVE_CTRL.x, y: CURVE_CTRL.y - OUTWARD };
  var oCb = { x: CB_END.x, y: CB_END.y - OUTWARD };

  var coverD = "M " + oCb.x + " " + oCb.y;
  var STEPS = 8;
  for (var i = 1; i <= STEPS; i++) {
    var t = 1 - (1 - insertionT) * (i / STEPS);
    var p = quadPoint(oCornea, oCtrl, oCb, t);
    coverD += " L " + p.x + " " + p.y;
  }
  var irisFillD = coverD +
    " Q " + irisMid.x + " " + irisMid.y + " " + PUPIL_POINT.x + " " + PUPIL_POINT.y +
    " L " + PUPIL_POINT.x + " 345 L " + (CB_END.x + 40) + " 345 Z";

  group.appendChild(svgEl("path", {
    d: irisFillD, fill: "#3d2a18", opacity: 0.97,
    "data-structure": "iris",
    class: "angle-structure" + (opts.clickableStructures ? " clickable" : "")
  }));
  group.appendChild(svgEl("path", {
    d: irisD, fill: "none", stroke: "#7a5230", "stroke-width": 2.5, opacity: 0.7,
    style: "pointer-events:none"
  }));
  group.appendChild(svgEl("path", {
    d: irisD, fill: "none", stroke: "transparent", "stroke-width": 18,
    "data-structure": "iris",
    class: "angle-structure" + (opts.clickableStructures ? " clickable" : "")
  }));

  // PAS: a synechial patch fading in near the anterior end as pasStrength rises
  if (vs.pasStrength > 0.02) {
    var pasP0 = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, 0);
    var pasP1 = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, 0.2);
    group.appendChild(svgEl("path", {
      d: "M " + pasP0.x + " " + (pasP0.y + 14) + " L " + pasP1.x + " " + (pasP1.y + 12) +
        " L " + pasP1.x + " " + pasP1.y + " L " + pasP0.x + " " + pasP0.y + " Z",
      fill: "#3d2a18", opacity: 0.9 * vs.pasStrength, style: "pointer-events:none"
    }));
    var label = svgEl("text", { x: pasP0.x - 5, y: pasP0.y - 12, class: "annotation", fill: "#ff8f6b", opacity: vs.pasStrength });
    label.textContent = "PAS";
    group.appendChild(label);
  }

  // Sampaolesi line
  if (vs.sampaolesiStrength > 0.02) {
    var samP0 = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, -0.05);
    var samP1 = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, 0.12);
    group.appendChild(svgEl("path", {
      d: "M " + samP0.x + " " + (samP0.y + 8) + " L " + samP1.x + " " + (samP1.y + 4),
      stroke: "#c9a35a", "stroke-width": 2, "stroke-dasharray": "3,2", fill: "none",
      opacity: 0.8 * vs.sampaolesiStrength, style: "pointer-events:none"
    }));
  }

  // neovascular vessels
  if (vs.vesselStrength > 0.02) {
    var vp = quadPoint(CORNEA_END, CURVE_CTRL, CB_END, 0.5);
    group.appendChild(svgEl("path", {
      d: "M " + (vp.x - 40) + " " + (vp.y + 60) + " Q " + (vp.x - 10) + " " + (vp.y + 20) + " " + vp.x + " " + vp.y +
        " Q " + (vp.x + 15) + " " + (vp.y - 20) + " " + (vp.x + 30) + " " + (vp.y - 35),
      stroke: "#ff4d3d", "stroke-width": 1.5, fill: "none",
      opacity: 0.9 * vs.vesselStrength, filter: "url(#gonioSoftGlow)", style: "pointer-events:none"
    }));
  }

  // fixation reticle, fixed at the viewport center (not rotated)
  svg.appendChild(svgEl("line", { x1: 285, y1: 200, x2: 315, y2: 200, stroke: "#cfcfcf", "stroke-width": 1, opacity: 0.6 }));
  svg.appendChild(svgEl("line", { x1: 300, y1: 185, x2: 300, y2: 215, stroke: "#cfcfcf", "stroke-width": 1, opacity: 0.6 }));

  if (insertionT < 0.05 || vs.pasStrength > 0.5) {
    var t2 = svgEl("text", { x: 20, y: 380, class: "annotation", fill: "#d8cfc4", opacity: 0.85 });
    t2.textContent = "iridotrabecular contact";
    svg.appendChild(t2);
  }
};

/* ---- Clock dial: gaze/progress indicator, position driven continuously ---- */
Gonio.renderDial = function (svg, continuousHour, onSelect) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  ensureDefs(svg);

  var cx = 70, cy = 70, r = 55;
  var wrapped = Gonio.wrapHour(continuousHour);

  svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "#d8cbb0", "stroke-width": 9 }));
  svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: r - 8, fill: "none", stroke: "#3a2a1e", "stroke-width": 7, "stroke-dasharray": "3.5 3" }));
  svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: r - 15, fill: "url(#gonioFundus)", stroke: "#000", "stroke-width": 1 }));

  var frac = wrapped / 12;
  var endAngle = frac * 2 * Math.PI - Math.PI / 2;
  var startAngle = -Math.PI / 2;
  var largeArc = frac > 0.5 ? 1 : 0;
  var ax = cx + Math.cos(endAngle) * r;
  var ay = cy + Math.sin(endAngle) * r;
  var sx = cx + Math.cos(startAngle) * r;
  var sy = cy + Math.sin(startAngle) * r;
  if (frac > 0.001) {
    svg.appendChild(svgEl("path", {
      d: "M " + sx + " " + sy + " A " + r + " " + r + " 0 " + largeArc + " 1 " + ax + " " + ay,
      fill: "none", stroke: "#3fae4a", "stroke-width": 9, "stroke-linecap": "round"
    }));
  }

  var hAngle = frac * 2 * Math.PI - Math.PI / 2;
  var hx = cx + Math.cos(hAngle) * (r - 15);
  var hy = cy + Math.sin(hAngle) * (r - 15);
  svg.appendChild(svgEl("line", { x1: cx, y1: cy, x2: hx, y2: hy, stroke: "#ff4d3d", "stroke-width": 1.5, opacity: 0.85 }));
  svg.appendChild(svgEl("circle", { cx: hx, cy: hy, r: 3, fill: "#ffcf3f" }));

  var currentHour = Gonio.nearestHour(continuousHour);
  for (var h = 1; h <= 12; h++) {
    var angle = (h / 12) * 2 * Math.PI - Math.PI / 2;
    var x = cx + Math.cos(angle) * (r + 12);
    var y = cy + Math.sin(angle) * (r + 12);
    var isCurrent = h === currentHour;
    var g = svgEl("g", { class: "dial-hour", "data-hour": h, style: "cursor:pointer" });
    g.appendChild(svgEl("circle", {
      cx: x, cy: y, r: 9,
      fill: isCurrent ? "#2b6cb0" : "#f3efe6",
      stroke: "#8aa", opacity: isCurrent ? 1 : 0.85
    }));
    var label = svgEl("text", {
      x: x, y: y + 3.5, "text-anchor": "middle", "font-size": 9,
      fill: isCurrent ? "#fff" : "#333"
    });
    label.textContent = h;
    g.appendChild(label);
    g.addEventListener("click", function (hh) {
      return function () { onSelect(hh); };
    }(h));
    svg.appendChild(g);
  }
};

window.Gonio = Gonio;
