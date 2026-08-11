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

  function drawSectors(g) {
    if (!SECTORS.length) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (secCanvas.width !== canvas.width || secCanvas.height !== canvas.height) {
      secCanvas.width = canvas.width; secCanvas.height = canvas.height;
    }
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, g.cw, g.ch);
    var keep = ctx; ctx = sctx;            // paint the wedges offscreen
    paintSectors(g);
    ctx = keep;
    ctx.save();
    ctx.filter = "blur(" + Math.max(3, g.ch * 0.016).toFixed(1) + "px)";
    ctx.drawImage(secCanvas, 0, 0, g.cw, g.ch);
    ctx.restore();
  }

  function paintSectors(g) {
    for (var i = 0; i < SECTORS.length; i++) {
      var s = SECTORS[i];
      // pigment bands sit on the meshwork; PAS sweep up from the iris to
      // whichever structure they reach (`reach` = structure index)
      var isPig = (s.type === "pigment"), isPale = (s.type === "pale");
      var rIn = (s.rIn != null) ? s.rIn
              : isPig ? DEFAULT_STRUCTURES[3].rIn
              : isPale ? DEFAULT_STRUCTURES[1].rIn : STRUCTURES[0].rIn;
      var rOut = (s.rOut != null) ? s.rOut
               : (s.reach != null) ? DEFAULT_STRUCTURES[s.reach].rOut
               : isPig ? DEFAULT_STRUCTURES[4].rIn
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
