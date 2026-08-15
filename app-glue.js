/* Glue between the seamless disc viewer (viewer.js / window.__gonioViewer) and
   the teaching UI (case selector, clock dial, Explore / Label / Grading). The
   view is a single real 360° disc (Normal open angle imagery); the case data
   in data.js drives the Explore descriptions and the grading readout. */

(function () {
  var V = window.__gonioViewer;
  if (!V) { console.error("viewer not ready"); return; }

  // structures in the viewer's radial order (index 0 = innermost)
  var STRUCTS = [
    { name: "Iris", desc: "The iris root and its insertion into the ciliary body face (the angle recess). Its level relative to the landmarks above sets the Shaffer grade; the peripheral contraction roll can partly hide the meshwork." },
    { name: "Ciliary body band", desc: "A light-grey to dark-brown band between the scleral spur and the iris root, seen only in wide-open angles — broad in myopic/aphakic eyes, narrow to absent in hyperopes." },
    { name: "Scleral spur", desc: "A ridge of sclera marking the posterior border of the meshwork; usually the sharpest landmark — white to light-grey (yellowish in older eyes)." },
    { name: "Trabecular meshwork", desc: "The filtering meshwork between the scleral spur and Schwalbe's line, carrying ~90% of aqueous outflow. Its posterior part overlies Schlemm's canal and pigments with age, heaviest inferiorly." },
    { name: "Schwalbe's line", desc: "The anterior border of the meshwork — the termination of Descemet's membrane — usually a subtle change in colour/density, occasionally a fine ridge; pigment can settle here (Sampaolesi's line)." },
    { name: "Cornea", desc: "The clear cornea anterior to Schwalbe's line; the corneal wedge (two slit-beam reflections meeting at Schwalbe's) pinpoints the angle." }
  ];

  // deepest visible structure (viewer index) for a given clock-hour's iris
  // insertion; everything more posterior is covered by apposed iris. Cornea (5)
  // means a closed angle where no angle structure is seen.
  var DEEPEST_BY_INSERTION = { cb: 1, spur: 2, tm_p: 3, tm_np: 3, schwalbe: 4, closed: 5 };
  function deepestFor(hd) { return hd.pasBridge ? 5 : (DEEPEST_BY_INSERTION[hd.insertion] || 1); }

  var $ = function (id) { return document.getElementById(id); };
  var mode = "explore";
  var maskable = true;          // masks are only calibrated for the normal angle
  var currentCase = Gonio.CASES[0];

  /* ---- pathology sidebar ---- */
  var sidebar = $("sidebar");
  function sideItem(c) {
    var d = document.createElement("div");
    d.className = "side-item" + (c.id === "normal" ? " active" : "");
    d.textContent = c.name; d.setAttribute("data-case", c.id);
    d.addEventListener("click", function () { selectCase(c.id); });
    return d;
  }
  // ungrouped cases (Normal) first, then each named group with a count badge
  Gonio.CASES.filter(function (c) { return !c.group; }).forEach(function (c) {
    sidebar.appendChild(sideItem(c));
  });
  Gonio.CASE_GROUPS.forEach(function (gname) {
    var members = Gonio.CASES.filter(function (c) { return c.group === gname; });
    if (!members.length) return;
    var grp = document.createElement("div"); grp.className = "side-group";
    var head = document.createElement("div"); head.className = "side-group-head";
    head.appendChild(document.createTextNode(gname + " "));
    var badge = document.createElement("span"); badge.className = "badge"; badge.textContent = members.length;
    head.appendChild(badge);
    grp.appendChild(head);
    members.forEach(function (c) { grp.appendChild(sideItem(c)); });
    sidebar.appendChild(grp);
  });

  function selectCase(id) {
    setCase(id);
    var items = sidebar.querySelectorAll(".side-item");
    for (var i = 0; i < items.length; i++) items[i].classList.toggle("active", items[i].getAttribute("data-case") === id);
  }
  function setCase(id) {
    currentCase = Gonio.caseById(id);
    V.setDiscImage(currentCase.disc);        // swap to this case's disc
    V.setBaseStructures(currentCase.masks);  // per-disc mask baseline, if it needs one
    V.setSectors(currentCase.sectors);       // sectoral findings, fixed to the clock
    /* The masks are calibrated against the normal angle's disc. On any other
       case the bands sit differently — a narrow angle has the iris right up over
       the meshwork — so the highlight would land on the wrong tissue and teach
       the wrong thing. Masks are therefore offered only on the normal angle. */
    maskable = (currentCase.id === "normal");
    V.setMasks(maskable && maskSwitch.checked);
    maskSwitch.disabled = !maskable;
    maskSwitch.closest(".mask-toggle").classList.toggle("disabled", !maskable);
    applyVisibility();                       // show only the layers present in this case
    $("case-desc").textContent = currentCase.description;
    updateGrading();
  }

  /* ---- Explore list ---- */
  var list = $("explore-list");
  STRUCTS.forEach(function (s, i) {
    var li = document.createElement("li");
    li.innerHTML = '<div class="s-name">' + s.name + '</div><div class="s-desc">' + s.desc + '</div>';
    li.addEventListener("mouseenter", function () { V.setHover(i); });
    li.addEventListener("mouseleave", function () { V.setHover(-1); });
    list.appendChild(li);
  });
  function markList(i) {
    var items = list.children;
    for (var k = 0; k < items.length; k++) items[k].classList.toggle("hot", k === i);
  }
  V.onHover(function (i) { if (mode !== "label") markList(i); });

  /* apply which anatomy layers are present for the current case + clock hour:
     hide the covered posterior structures on the disc and grey them in the list */
  function applyVisibility() {
    var hd = currentCase.clockHours[V.getHour()];
    var deepest = deepestFor(hd), t = V.getTilt(), opened = 0;
    // Tilting the lens toward the angle lets you see farther posteriorly — but
    // only where the structures are merely hidden by the iris convexity
    // (optical closure). Appositional and synechial closure do not open.
    if (t > 0.25 && hd.closure === "optical") {
      opened = (t > 0.7) ? 2 : 1;
      deepest = Math.max(1, deepest - opened);
    }
    // A case can expose masks its grading would otherwise cover, for discs that
    // plainly show a structure the Shaffer insertion says you would not identify.
    if (currentCase.masksDownTo != null) deepest = Math.min(deepest, currentCase.masksDownTo);
    V.setDeepest(deepest);
    var items = list.children;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("off", !(i === 0 || i >= deepest));
    }
    updateTiltCaption(t, hd, opened);
  }

  /* ---- goniolens tilt ---- */
  var tiltRange = $("tilt-range"), tiltCaption = $("tilt-caption");
  function updateTiltCaption(t, hd, opened) {
    var msg;
    if (t <= 0.25 && t >= -0.25) msg = "Straight on — the natural, worst-case view.";
    else if (t < -0.25) msg = "Tilted away — the angle wall is seen more obliquely, so the bands foreshorten and crowd together.";
    else if (opened) msg = "Tilted toward the angle — the wall opens towards you and the bands stretch apart; " +
      (opened > 1 ? "the angle opens up fully." : "one more structure comes into view.");
    else if (hd.closure === "synechial") msg = "Tilted toward the angle — the bands stretch, but these synechiae are adherent, so nothing opens.";
    else if (hd.closure === "appositional") msg = "Tilted toward the angle — the iris is against the meshwork; indentation, not tilt, is needed here.";
    else msg = "Tilted toward the angle — the bands stretch apart; all structures were already visible.";
    tiltCaption.textContent = msg;
  }
  tiltRange.addEventListener("input", function () { V.setTilt(tiltRange.value / 100); });
  $("tilt-reset").addEventListener("click", function () { V.setTilt(0); });
  // keep the slider honest when tilt is changed from anywhere else
  V.onTilt(function (t) { tiltRange.value = Math.round(t * 100); applyVisibility(); });

  /* ---- anatomy-mask toggle ---- */
  var maskSwitch = $("mask-switch");
  maskSwitch.addEventListener("change", function () { V.setMasks(maskable && maskSwitch.checked); });

  /* ---- clock-hour dial: grab the outer knob and spin ---- */
  var svg = $("dial-svg"), rotor = $("dial-rotor"), knobNum = $("knob-num");
  var CX = 100, CY = 100, KR = 78, TWO_PI = Math.PI * 2;   // KR = knob-centre radius (on the ring)
  var dialDragging = false;

  function dialFromPointer(e) {
    var rect = svg.getBoundingClientRect(), scale = 200 / rect.width;
    var x = (e.clientX - rect.left) * scale, y = (e.clientY - rect.top) * scale;
    var theta = Math.atan2(x - CX, CY - y);      // radians, clockwise from top
    var p = theta / TWO_PI * 12; if (p < 0) p += 12;
    V.freeze(p);                                  // hold exactly where the knob is
  }
  svg.addEventListener("pointerdown", function (e) {
    dialDragging = true; svg.setPointerCapture(e.pointerId); dialFromPointer(e); e.preventDefault();
  });
  svg.addEventListener("pointermove", function (e) { if (dialDragging) dialFromPointer(e); });
  function dialEnd() { if (dialDragging) { dialDragging = false; V.unfreeze(); } } // release → settle to nearest hour
  svg.addEventListener("pointerup", dialEnd);
  svg.addEventListener("pointercancel", dialEnd);

  // spin the whole rotor (line + glyph + knob) with the view; keep the number upright
  function syncDial() {
    var pos = V.getPos(), theta = pos / 12 * TWO_PI;
    rotor.setAttribute("transform", "rotate(" + (pos / 12 * 360).toFixed(2) + " " + CX + " " + CY + ")");
    knobNum.setAttribute("x", (CX + KR * Math.sin(theta)).toFixed(2));
    knobNum.setAttribute("y", (CY - KR * Math.cos(theta)).toFixed(2));
    knobNum.textContent = V.getHour();
    requestAnimationFrame(syncDial);
  }
  requestAnimationFrame(syncDial);

  V.onHour(function () { applyVisibility(); updateGrading(); });

  /* ---- mode tabs ---- */
  var tabs = document.querySelectorAll(".mode-tab");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      mode = t.getAttribute("data-mode");
      $("explore-panel").style.display = mode === "explore" ? "" : "none";
      $("label-panel").style.display = mode === "label" ? "" : "none";
      $("grading-panel").style.display = mode === "grading" ? "" : "none";
      if (mode !== "explore") markList(-1);
      // the quiz keeps the highlight but not the name, which would answer it
      V.setNameLabel(mode !== "label");
      if (mode === "label") newLabelQuestion();
    });
  });

  /* ---- Label quiz ---- */
  var target = -1, score = 0, asked = 0;
  function newLabelQuestion() {
    // only ask for structures actually visible in this case at the current hour
    var deepest = deepestFor(currentCase.clockHours[V.getHour()]);
    var pool = [];
    for (var i = 0; i < STRUCTS.length; i++) if (i === 0 || i >= deepest) pool.push(i);
    target = pool[Math.floor(Math.random() * pool.length)];
    $("label-prompt").innerHTML = "Find and click: <b>" + STRUCTS[target].name + "</b>";
    $("label-feedback").textContent = ""; $("label-feedback").className = "feedback";
  }
  $("label-next").addEventListener("click", newLabelQuestion);
  $("stage").addEventListener("click", function () {
    if (mode !== "label" || target < 0) return;
    var hit = V.getHover(), fb = $("label-feedback");
    asked++;
    if (hit === target) { score++; fb.textContent = "Correct — " + STRUCTS[target].name + "."; fb.className = "feedback ok"; }
    else { fb.textContent = hit >= 0 ? "That's the " + STRUCTS[hit].name + ". Try again." : "Nothing there — aim at the structure."; fb.className = "feedback no"; }
    $("label-score").textContent = "Score: " + score + " / " + asked;
    if (hit === target) setTimeout(newLabelQuestion, 900);
  });

  /* ---- Grading readout ---- */
  function updateGrading() {
    var h = V.getHour(), hd = currentCase.clockHours[h];
    var g = Gonio.shaffer(hd), sp = Gonio.spaethNotation(hd);
    $("grading-info").innerHTML =
      '<p><b>Shaffer grade ' + g.grade + '</b> — ' + g.label + ' (' + g.range + ')<br>' + g.note + '</p>' +
      '<p>Risk of closure: <b>' + g.risk + '</b></p>' +
      '<p>Spaeth: <b>' + sp + '</b></p>';
  }

  setCase("normal");
})();
