/* Gonioscopy angle viewer — a single continuous en-face disc (pupil at the
   centre, iris → trabecular meshwork → sclera as concentric rings) is displayed
   zoomed into its top arc, giving the oblique gonio view (cornea up, iris down).
   Scrolling ROTATES the one disc image, so navigation around the clock is
   perfectly seamless — no frames, no cross-fade. The anatomy is concentric, so
   the hover-glow masks are simple rings about the centre. */

(function () {
  var DISC_SRC = "disc.png";
  var HOURS = 12;
  var TWO_PI = Math.PI * 2;

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("stage");
  var labelEl = document.getElementById("label");
  var fillEl = document.getElementById("fill");
  var hoverLabel = document.getElementById("hoverlabel");
  var calibEl = document.getElementById("calib");

  var disc = new Image();
  var loaded = false;

  // continuous clock position (0 = 12 o'clock); inertial motion
  var pos = 0, vel = 0, frozen = false;
  var FRICTION = 0.94, SETTLE = 0.06;

  // display: the disc centre (pupil) sits below the viewport so the top arc —
  // sclera(rim)→iris(centre) — reads as the gonio view. Tunable.
  var PUPIL_CY = 2.3;      // disc-centre y (frac of height) at 12 o'clock
  var ORBIT_CY = 0.5;      // the view orbits about this point (frac of height)
  var DISC_ZOOM = 3.85;    // disc scale per 1000px of stage height (stage-independent)
  function discScale() { return DISC_ZOOM * stage.clientHeight / 1000; }
  var DISC_DIR = 1;        // spin direction

  // goniolens tilt: -1 (away) … 0 (straight on) … +1 (tilted toward the angle)
  var tilt = 0, TILT_REACH = 0.16;   // fraction of stage height of extra reach
  var tiltCb = null;

  // sectoral findings drawn in eye-space (fixed to the clock, not to the view)
  var SECTORS = [];

  // structures as concentric bands, radius in fractions of the disc half-width
  var STRUCTURES = [
    { name: "Iris",                rIn: 0.54, rOut: 0.72 },
    { name: "Ciliary body band",   rIn: 0.72, rOut: 0.786 },
    { name: "Scleral spur",        rIn: 0.786, rOut: 0.802 },
    { name: "Trabecular meshwork", rIn: 0.802, rOut: 0.858 },
    { name: "Schwalbe's line",     rIn: 0.846, rOut: 0.872 },
    { name: "Cornea",              rIn: 0.878, rOut: 0.99 }
  ];
  // default ring radii, restored when a case doesn't override the masks
  var DEFAULT_STRUCTURES = JSON.parse(JSON.stringify(STRUCTURES));
  // which structures are currently present (some pathologies hide deeper layers)
  var activeMask = STRUCTURES.map(function () { return true; });
  var GLOW_ALPHA = 0.24;

  /* Reveal structures only down to `deepest` (index of the deepest visible
     structure, 1=ciliary body band … 5=cornea-only / closed). Anything more
     posterior than that is covered by apposed iris, so it is hidden and the
     iris ring is extended outward to fill the covered zone. Index 0 (iris) and
     the cornea are always present. */
  function setDeepest(deepest) {
    deepest = Math.max(1, Math.min(STRUCTURES.length - 1, deepest));
    for (var i = 0; i < STRUCTURES.length; i++) {
      STRUCTURES[i].rIn = DEFAULT_STRUCTURES[i].rIn;
      STRUCTURES[i].rOut = DEFAULT_STRUCTURES[i].rOut;
      activeMask[i] = (i === 0) || (i >= deepest);
    }
    STRUCTURES[0].rOut = DEFAULT_STRUCTURES[deepest].rIn;   // iris fills the covered zone
    if (hoverStruct >= 0 && !activeMask[hoverStruct]) hoverStruct = -1;
  }
  var MASKS_ON = true;     // hover glow + floating name label (toggleable)
  var hoverStruct = -1, DEBUG_RINGS = false;
  var hoverCb = null, hourCb = null, lastHour = -1;

  var LABELS = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  function hourLabel(p) { var h = ((Math.round(p) % HOURS) + HOURS) % HOURS; return LABELS[h] + " o'clock"; }

  function load() {
    disc.onload = function () { loaded = true; };
    disc.src = DISC_SRC + "?v=" + Date.now();
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(stage.clientWidth * dpr);
    canvas.height = Math.floor(stage.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* geometry: pupil (disc centre) canvas position + canvas px per disc-half-width.
     The eye is FIXED in space; travelling around the clock moves the viewing
     position around it, so the pupil orbits the viewport centre while the disc
     itself keeps a constant orientation. That way each clock hour really shows
     its own sector of tissue (essential for sectoral findings such as PAS)
     rather than the same sector spinning on itself.
     Tilt models tilting the goniolens toward the angle being viewed, which lets
     the examiner see farther posteriorly into the recess (Bayer & Spaeth, Ch. 3
     "Advanced Maneuvers"): it shortens the pupil→viewport distance so deeper
     structures come into frame. */
  function geom() {
    var cw = stage.clientWidth, ch = stage.clientHeight;
    var theta = pos / HOURS * TWO_PI * DISC_DIR;
    var Rorbit = (PUPIL_CY - ORBIT_CY) * ch - tilt * TILT_REACH * ch;
    // the disc centre (pupil) orbits the pivot as the view turns
    var px = cw / 2 - Rorbit * Math.sin(theta);
    var py = ORBIT_CY * ch + Rorbit * Math.cos(theta);
    return { cw: cw, ch: ch, px: px, py: py, theta: theta,
             unit: (disc.width / 2) * discScale() };
  }

  function render() {
    var cw = stage.clientWidth, ch = stage.clientHeight;
    ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch);

    // clock bookkeeping happens even while a disc is still loading, so the
    // grading and visibility readouts never miss an hour change during a swap
    labelEl.textContent = hourLabel(pos);
    var frac0 = ((pos % HOURS) + HOURS) % HOURS;
    fillEl.style.width = (frac0 / HOURS * 100).toFixed(1) + "%";
    var hNow = ((Math.round(pos) % HOURS) + HOURS) % HOURS; hNow = hNow === 0 ? 12 : hNow;
    if (hNow !== lastHour) { lastHour = hNow; if (hourCb) hourCb(hNow); }

    if (!loaded) return;

    var g = geom();
    ctx.save();
    // draw the disc unrotated about the orbiting pupil, so the sector on screen
    // is the sector we have actually travelled to
    ctx.translate(g.px, g.py);
    var sc = discScale();
    ctx.scale(sc, sc);
    ctx.drawImage(disc, -disc.width / 2, -disc.height / 2);
    ctx.restore();

    drawSectors(g);
    if (MASKS_ON) drawGlow(hoverStruct);
    if (DEBUG_RINGS) drawDebugRings();
  }

  /* ---- hover / glow — concentric rings about the pupil -------------- */
  function structureAt(cx, cy) {
    var g = geom(), r = Math.hypot(cx - g.px, cy - g.py) / g.unit;
    // iterate outermost→innermost so that where bands overlap the more
    // anterior structure (e.g. Schwalbe's line over TM) wins the hover
    for (var i = STRUCTURES.length - 1; i >= 0; i--) {
      if (!activeMask[i]) continue;                 // hidden in this pathology
      if (r >= STRUCTURES[i].rIn && r < STRUCTURES[i].rOut) return i;
    }
    return -1;
  }

  function drawGlow(si) {
    if (si < 0 || !activeMask[si]) return;
    var g = geom(), s = STRUCTURES[si];
    var rIn = s.rIn * g.unit, rOut = s.rOut * g.unit;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var grad = ctx.createRadialGradient(g.px, g.py, rIn, g.px, g.py, rOut);
    grad.addColorStop(0, "rgba(255,236,190,0)");
    grad.addColorStop(0.5, "rgba(255,236,190," + GLOW_ALPHA + ")");
    grad.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(g.px, g.py, rOut, 0, TWO_PI); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- sectoral findings, drawn in eye-space -----------------------
     Angles are absolute clock positions, so a finding stays put on the eye as
     you travel round: PAS sit superiorly, pigment settles inferiorly, etc. */
  function sectorPath(g, rIn, rOut, h0, h1) {
    var a0 = h0 / HOURS * TWO_PI - Math.PI / 2;
    var a1 = h1 / HOURS * TWO_PI - Math.PI / 2;
    if (a1 <= a0) a1 += TWO_PI;
    ctx.beginPath();
    ctx.arc(g.px, g.py, rOut * g.unit, a0, a1);
    ctx.arc(g.px, g.py, rIn * g.unit, a1, a0, true);
    ctx.closePath();
  }

  // sectors are painted to an offscreen layer and composited through a blur, so
  // their edges fade into the surrounding tissue instead of ending in a hard cut
  var secCanvas = document.createElement("canvas");
  var sctx = secCanvas.getContext("2d");

  // diffuse tissue changes are blurred; discrete structures (vessels, processes,
  // precipitates, devices) must stay crisp, so they are drawn after the blur
  var SHARP = { vessels: 1, processes: 1, kp: 1, laser: 1, stent: 1, dialysis: 1 };

  function drawSectors(g) {
    if (!SECTORS.length) return;
    var soft = [], sharp = [], i;
    for (i = 0; i < SECTORS.length; i++)
      (SHARP[SECTORS[i].type] ? sharp : soft).push(SECTORS[i]);

    if (soft.length) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (secCanvas.width !== canvas.width || secCanvas.height !== canvas.height) {
        secCanvas.width = canvas.width; secCanvas.height = canvas.height;
      }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, g.cw, g.ch);
      var keep = ctx; ctx = sctx;          // paint the wedges offscreen
      paintSectors(g, soft);
      ctx = keep;
      ctx.save();
      ctx.filter = "blur(" + Math.max(3, g.ch * 0.016).toFixed(1) + "px)";
      ctx.drawImage(secCanvas, 0, 0, g.cw, g.ch);
      ctx.restore();
    }
    for (i = 0; i < sharp.length; i++) paintFeature(g, sharp[i]);
  }

  /* ---- discrete angle features -------------------------------------- */
  // point at radius r (fraction of disc half-width) and clock position `hour`
  function polar(g, r, hour) {
    var a = hour / HOURS * TWO_PI;
    return [g.px + r * g.unit * Math.sin(a), g.py - r * g.unit * Math.cos(a)];
  }
  // deterministic PRNG so features don't shimmer between frames
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function moveToP(p) { ctx.moveTo(p[0], p[1]); }
  function lineToP(p) { ctx.lineTo(p[0], p[1]); }

  function paintFeature(g, s) {
    var S = DEFAULT_STRUCTURES, rand = rng(s.seed || 7), n, i, h, span = s.to - s.from;
    // stroke weights are sized from the stage, not the (much larger) disc radius
    var hair = Math.max(0.7, g.ch * 0.0016);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (s.type === "vessels") {
      // neovascular tufts: fine, delicate, branching, crossing the scleral spur
      n = Math.max(8, Math.round(span * (s.density || 9)));
      for (i = 0; i < n; i++) {
        h = s.from + rand() * span;
        var rA = S[1].rIn - 0.01 + rand() * 0.02;       // arising over the ciliary band
        var rB = S[3].rIn + 0.012 + rand() * 0.03;      // reaching the meshwork
        var wob = (rand() - 0.5) * 0.10;
        ctx.strokeStyle = "rgba(178,52,44," + (0.5 + rand() * 0.3).toFixed(2) + ")";
        ctx.lineWidth = hair * (0.9 + rand() * 0.5);
        ctx.beginPath();
        moveToP(polar(g, rA, h));
        ctx.quadraticCurveTo.apply(ctx,
          polar(g, (rA + rB) / 2, h + wob).concat(polar(g, rB, h + wob * 0.3)));
        ctx.stroke();
        if (rand() < 0.5) {                             // a short branch
          ctx.lineWidth = hair * 0.7;
          ctx.beginPath();
          moveToP(polar(g, rA + (rB - rA) * 0.55, h + wob * 0.6));
          lineToP(polar(g, rB - 0.012, h + wob * 0.6 + (rand() - 0.5) * 0.18));
          ctx.stroke();
        }
      }
    } else if (s.type === "processes") {
      // iris processes: delicate lacy strands following the concavity of the recess
      n = Math.max(10, Math.round(span * (s.density || 14)));
      for (i = 0; i < n; i++) {
        h = s.from + rand() * span;
        ctx.strokeStyle = s.dark
          ? "rgba(58,36,20," + (0.55 + rand() * 0.3).toFixed(2) + ")"
          : "rgba(146,124,96," + (0.35 + rand() * 0.28).toFixed(2) + ")";
        ctx.lineWidth = hair * (0.7 + rand() * 0.5);
        ctx.beginPath();
        moveToP(polar(g, S[0].rOut - 0.012, h));
        lineToP(polar(g, S[1].rOut + rand() * (S[2].rOut - S[1].rOut), h + (rand() - 0.5) * 0.06));
        ctx.stroke();
      }
    } else if (s.type === "kp") {
      // inflammatory precipitates sitting on the meshwork
      n = Math.max(8, Math.round(span * (s.density || 10)));
      for (i = 0; i < n; i++) {
        h = s.from + rand() * span;
        var rr = S[3].rIn + rand() * (S[4].rIn - S[3].rIn);
        var p = polar(g, rr, h), rad = hair * (1.4 + rand() * 1.6);
        ctx.fillStyle = "rgba(226,219,202," + (0.45 + rand() * 0.35).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, TWO_PI); ctx.fill();
      }
    } else if (s.type === "laser") {
      // trabeculoplasty burns evenly spaced along the anterior pigmented meshwork
      n = Math.max(4, Math.round(span * (s.density || 6)));
      for (i = 0; i < n; i++) {
        h = s.from + (i + 0.5) / n * span;
        var pb = polar(g, S[3].rIn + (S[3].rOut - S[3].rIn) * 0.35, h), rb = hair * 2.2;
        ctx.fillStyle = "rgba(244,238,224,0.5)";
        ctx.beginPath(); ctx.arc(pb[0], pb[1], rb, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = "rgba(86,58,32,0.45)"; ctx.lineWidth = hair * 0.6;
        ctx.beginPath(); ctx.arc(pb[0], pb[1], rb, 0, TWO_PI); ctx.stroke();
      }
    } else if (s.type === "stent") {
      // a trabecular bypass device seated across the meshwork
      var mid = (s.from + s.to) / 2;
      var a1 = polar(g, S[3].rIn + 0.006, s.from), a2 = polar(g, S[3].rIn + 0.006, s.to);
      ctx.strokeStyle = "rgba(226,231,238,0.95)"; ctx.lineWidth = hair * 3.4;
      ctx.beginPath(); moveToP(a1); lineToP(a2); ctx.stroke();
      ctx.strokeStyle = "rgba(108,120,136,0.85)"; ctx.lineWidth = hair * 1.1;
      ctx.beginPath(); moveToP(a1); lineToP(a2); ctx.stroke();
      ctx.strokeStyle = "rgba(214,221,230,0.9)"; ctx.lineWidth = hair * 2;
      ctx.beginPath();
      moveToP(polar(g, S[3].rIn - 0.022, mid)); lineToP(polar(g, S[3].rIn + 0.012, mid));
      ctx.stroke();
    } else if (s.type === "dialysis") {
      // iris root torn away: a dark gap at the recess with the ciliary processes
      // seen through it as irregular pale ridges
      var dIn = S[0].rOut - 0.028, dOut = S[1].rOut + 0.002;
      sectorPath(g, dIn, dOut, s.from, s.to);
      ctx.save(); ctx.clip();
      var dg = ctx.createRadialGradient(g.px, g.py, dIn * g.unit, g.px, g.py, dOut * g.unit);
      dg.addColorStop(0, "rgba(16,10,6,0)");
      dg.addColorStop(0.28, "rgba(16,10,6,0.92)");
      dg.addColorStop(0.86, "rgba(20,13,8,0.9)");
      dg.addColorStop(1, "rgba(24,16,10,0)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, g.cw, g.ch);
      // ciliary processes: irregular in width, spacing and length
      var pos2 = 0.04;
      while (pos2 < 0.96) {
        h = s.from + pos2 * span;
        var len = 0.34 + rand() * 0.22, top = 0.82 + rand() * 0.1;
        ctx.strokeStyle = "rgba(202,176,140," + (0.5 + rand() * 0.4).toFixed(2) + ")";
        ctx.lineWidth = hair * (3.2 + rand() * 2.4);
        ctx.beginPath();
        moveToP(polar(g, dIn + (dOut - dIn) * (top - len), h));
        lineToP(polar(g, dIn + (dOut - dIn) * top, h));
        ctx.stroke();
        pos2 += 0.035 + rand() * 0.04;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function paintSectors(g, list) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      // pigment bands sit on the meshwork; PAS sweep up from the iris to
      // whichever structure they reach (`reach` = structure index)
      var isPig = (s.type === "pigment"), isPale = (s.type === "pale"),
          isBlood = (s.type === "blood");
      var rIn = (s.rIn != null) ? s.rIn
              : isPig ? DEFAULT_STRUCTURES[3].rIn
              : isBlood ? DEFAULT_STRUCTURES[2].rIn
              : isPale ? DEFAULT_STRUCTURES[1].rIn : STRUCTURES[0].rIn;
      var rOut = (s.rOut != null) ? s.rOut
               : (s.reach != null) ? DEFAULT_STRUCTURES[s.reach].rOut
               : isPig ? DEFAULT_STRUCTURES[4].rIn
               : isBlood ? DEFAULT_STRUCTURES[4].rIn
               : isPale ? DEFAULT_STRUCTURES[2].rOut : DEFAULT_STRUCTURES[4].rOut;
      var aMul = (s.strength != null) ? s.strength : 1;
      {
        var grad = ctx.createRadialGradient(g.px, g.py, rIn * g.unit,
                                            g.px, g.py, rOut * g.unit);
        if (isPale) {
          // bare sclera / thinly-covered ciliary face: angle recession, cyclodialysis
          grad.addColorStop(0, "rgba(226,219,205,0)");
          grad.addColorStop(0.3, "rgba(232,226,214," + (0.85 * aMul).toFixed(3) + ")");
          grad.addColorStop(0.8, "rgba(240,236,227," + (0.9 * aMul).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(228,222,210,0)");
        } else if (isBlood) {
          // blood layered on the meshwork, settling inferiorly under gravity
          grad.addColorStop(0, "rgba(126,16,14,0)");
          grad.addColorStop(0.3, "rgba(146,20,18," + (0.88 * aMul).toFixed(3) + ")");
          grad.addColorStop(0.85, "rgba(168,32,26," + (0.8 * aMul).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(150,24,20,0)");
        } else if (s.type === "pigment") {
          // heavy pigment banding over the meshwork
          grad.addColorStop(0, "rgba(48,26,10,0)");
          grad.addColorStop(0.35, "rgba(44,24,9," + (0.85 * aMul).toFixed(3) + ")");
          grad.addColorStop(0.85, "rgba(30,16,6," + (0.8 * aMul).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(30,16,6,0)");
        } else {
          // PAS: iris tissue bridging the recess up on to the meshwork
          grad.addColorStop(0, "rgba(158,92,40," + (0.97 * aMul).toFixed(3) + ")");
          grad.addColorStop(0.62, "rgba(138,78,34," + (0.92 * aMul).toFixed(3) + ")");
          grad.addColorStop(0.93, "rgba(120,66,28," + (0.55 * aMul).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(112,60,26,0)");
        }
        ctx.fillStyle = grad;
        sectorPath(g, rIn, rOut, s.from, s.to);
        ctx.fill();
      }
    }
  }

  function drawDebugRings() {
    var g = geom();
    var cols = ["rgba(255,235,60,0.30)", "rgba(90,220,90,0.34)", "rgba(90,220,255,0.40)",
                "rgba(230,110,240,0.32)", "rgba(255,90,90,0.36)", "rgba(120,200,255,0.28)"];
    for (var i = 0; i < STRUCTURES.length; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.arc(g.px, g.py, STRUCTURES[i].rOut * g.unit, 0, TWO_PI);
      ctx.arc(g.px, g.py, STRUCTURES[i].rIn * g.unit, 0, TWO_PI, true);
      ctx.fill("evenodd");
    }
  }

  /* ---- animation: inertial spin ------------------------------------ */
  function tick() {
    if (!dragging && !frozen) {
      pos += vel;
      vel *= FRICTION;
      if (Math.abs(vel) < 0.004) {
        var nearest = Math.round(pos);
        pos += (nearest - pos) * SETTLE;
        if (Math.abs(vel) < 0.0004 && Math.abs(nearest - pos) < 0.0004) { pos = nearest; vel = 0; }
      }
    }
    render();
    requestAnimationFrame(tick);
  }

  // the render loop runs continuously (black until the disc is loaded), so it
  // is independent of which disc image is currently loading
  function start() { resize(); requestAnimationFrame(tick); }

  /* ---- input: drag + wheel to spin --------------------------------- */
  var dragging = false, lastX = 0;
  var PX_PER_HOUR = 95;   // horizontal pixels per clock hour

  stage.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; vel = 0; stage.classList.add("dragging");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    var dp = -dx / PX_PER_HOUR;
    pos += dp; vel = dp;
  });
  function endDrag() { if (dragging) { dragging = false; stage.classList.remove("dragging"); } }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    vel += d * 0.0022;
  }, { passive: false });

  /* ---- hover-to-glow ----------------------------------------------- */
  stage.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    hoverStruct = structureAt(e.clientX - rect.left, e.clientY - rect.top);
    if (MASKS_ON && hoverStruct >= 0) {
      hoverLabel.textContent = STRUCTURES[hoverStruct].name;
      hoverLabel.style.left = e.clientX + "px";
      hoverLabel.style.top = e.clientY + "px";
      hoverLabel.style.opacity = "1";
      if (calibOn && hoverStruct >= 0) { activeStruct = hoverStruct; updateCalib(); }
    } else hoverLabel.style.opacity = "0";
    if (hoverCb) hoverCb(hoverStruct);
  });
  stage.addEventListener("mouseleave", function () { hoverStruct = -1; hoverLabel.style.opacity = "0"; });

  /* ---- interactive calibration (hover a band, arrow keys) ---------- */
  var calibOn = false, activeStruct = 0, STEP = 0.005;
  function updateCalib() {
    if (!calibOn) { calibEl.style.display = "none"; return; }
    var lines = ["  ↑/↓ move band   W/S inner edge   E/D outer edge", ""];
    for (var i = 0; i < STRUCTURES.length; i++) {
      var s = STRUCTURES[i], mark = i === activeStruct ? "▸ " : "  ";
      lines.push(mark + s.name + "  " + s.rIn.toFixed(3) + " – " + s.rOut.toFixed(3));
    }
    calibEl.textContent = lines.join("\n");
    calibEl.style.display = "block";
  }
  window.addEventListener("keydown", function (e) {
    if (!calibOn) return;
    var s = STRUCTURES[activeStruct], d = e.shiftKey ? STEP * 3 : STEP, k = e.key;
    if (k === "ArrowUp") { s.rIn += d; s.rOut += d; }
    else if (k === "ArrowDown") { s.rIn -= d; s.rOut -= d; }
    else if (k === "w") { s.rIn -= d; } else if (k === "s") { s.rIn += d; }
    else if (k === "e") { s.rOut -= d; } else if (k === "d") { s.rOut += d; }
    else if (k >= "1" && k <= "6") { activeStruct = +k - 1; }
    else return;
    e.preventDefault(); updateCalib();
  });

  window.addEventListener("resize", function () { resize(); render(); });

  window.__gonioViewer = {
    setTarget: function (t) { pos = t; vel = 0; },
    spin: function (v) { vel = v; },
    freeze: function (p) { pos = p; vel = 0; frozen = true; },
    unfreeze: function () { frozen = false; },
    getPos: function () { return pos; },
    setDisc: function (pupilCy, scale, dir) {
      if (pupilCy != null) PUPIL_CY = pupilCy;
      if (scale != null) DISC_ZOOM = scale;
      if (dir != null) DISC_DIR = dir;
    },
    debugRings: function (on) { DEBUG_RINGS = on; },
    setMasks: function (on) { MASKS_ON = !!on; if (!MASKS_ON) hoverLabel.style.opacity = "0"; },
    getMasks: function () { return MASKS_ON; },
    // swap the displayed disc (per-case pathology imagery)
    setDiscImage: function (src) {
      loaded = false; hoverStruct = -1;
      disc.onload = function () { loaded = true; render(); };
      disc.src = src + "?v=" + Date.now();
    },
    // per-case anatomy ring overrides; pass null/undefined to restore defaults
    setStructures: function (arr) {
      var src = (arr && arr.length) ? arr : DEFAULT_STRUCTURES;
      for (var i = 0; i < STRUCTURES.length; i++) {
        if (src[i]) { STRUCTURES[i].rIn = src[i].rIn; STRUCTURES[i].rOut = src[i].rOut; }
      }
    },
    // reveal structures only down to the deepest visible one (see setDeepest)
    setDeepest: function (d) { setDeepest(d); },
    isActive: function (i) { return !!activeMask[i]; },
    // sectoral findings (PAS, focal pigment) fixed to clock positions
    setSectors: function (arr) { SECTORS = (arr && arr.length) ? arr.slice() : []; },
    // goniolens tilt, -1 … +1 (positive = tilted toward the angle under view)
    setTilt: function (t) {
      t = Math.max(-1, Math.min(1, t || 0));
      if (t === tilt) return;
      tilt = t; if (tiltCb) tiltCb(tilt);
    },
    getTilt: function () { return tilt; },
    onTilt: function (cb) { tiltCb = cb; },
    // force a frame (rAF is throttled when the tab is hidden)
    redraw: function () { render(); },
    calibrate: function (on) { calibOn = on; DEBUG_RINGS = on; updateCalib(); },
    getStructures: function () { return JSON.parse(JSON.stringify(STRUCTURES)); },
    setStructureR: function (i, rIn, rOut) { STRUCTURES[i].rIn = rIn; STRUCTURES[i].rOut = rOut; },
    // app integration hooks
    structureName: function (i) { return (i >= 0 && i < STRUCTURES.length) ? STRUCTURES[i].name : null; },
    setHover: function (i) { hoverStruct = (i == null ? -1 : i); },
    getHover: function () { return hoverStruct; },
    getHour: function () { var h = ((Math.round(pos) % HOURS) + HOURS) % HOURS; return h === 0 ? 12 : h; },
    goToHour: function (h) { pos = (h % 12); vel = 0; },   // 12→0
    onHover: function (cb) { hoverCb = cb; },
    onHour: function (cb) { hourCb = cb; }
  };
  load();
  start();   // begin the render loop regardless of disc load timing
})();
