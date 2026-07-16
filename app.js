/* Gonioscopy Simulator — app wiring */
(function () {
  var state = {
    caseId: Gonio.CASES[0].id,
    continuousHour: 12,
    hour: 12,
    mode: "explore",
    labelTarget: null,
    score: { label: { correct: 0, total: 0 }, grading: { correct: 0, total: 0 } }
  };

  var els = {};
  var animFrame = null;
  var dragState = null;
  var justDragged = false;

  function q(id) { return document.getElementById(id); }

  function currentHourData() {
    return Gonio.caseById(state.caseId).clockHours[state.hour];
  }

  /* smoothly tweens continuousHour to an integer target along the shorter direction */
  function animateToHour(target, duration) {
    duration = duration || 450;
    if (animFrame) cancelAnimationFrame(animFrame);
    var startVal = state.continuousHour;
    var diff = target - startVal;
    while (diff > 6) diff -= 12;
    while (diff <= -6) diff += 12;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var p = Math.min(1, (ts - startTime) / duration);
      var eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      state.continuousHour = Gonio.wrapHour(startVal + diff * eased);
      renderAll();
      if (p < 1) animFrame = requestAnimationFrame(step);
      else animFrame = null;
    }
    animFrame = requestAnimationFrame(step);
  }

  function renderAll() {
    state.hour = Gonio.nearestHour(state.continuousHour);
    var hourData = currentHourData();
    Gonio.renderAngle(els.angleSvg, Gonio.caseById(state.caseId), state.continuousHour, {
      clickableStructures: state.mode === "label"
    });
    Gonio.renderDial(els.dialSvg, state.continuousHour, function (h) {
      state.labelTarget = null;
      animateToHour(h);
    });
    els.caseDesc.textContent = Gonio.caseById(state.caseId).description;
    els.hourReadout.textContent = "Clock hour: " + state.hour + ":00";

    renderModePanel(hourData);
  }

  function renderModePanel(hourData) {
    els.explorePanel.style.display = state.mode === "explore" ? "block" : "none";
    els.labelPanel.style.display = state.mode === "label" ? "block" : "none";
    els.gradingPanel.style.display = state.mode === "grading" ? "block" : "none";

    if (state.mode === "explore") {
      var visible = Gonio.visibleStructures(hourData);
      var lines = Gonio.STRUCTURES.map(function (s) {
        var seen = visible.indexOf(s.id) !== -1;
        return "<li class=\"" + (seen ? "seen" : "hidden") + "\"><strong>" + s.label + "</strong>" +
          (seen ? "" : " — not visible") + "<br><span class=\"desc\">" + s.desc + "</span></li>";
      }).join("");
      var extras = [];
      if (hourData.pasBridge) extras.push("Peripheral anterior synechia (PAS) at this clock hour — synechial, not appositional, closure.");
      if (hourData.vessels) extras.push("Fine neovascular vessels crossing the angle.");
      if (hourData.sampaolesi) extras.push("Sampaolesi's line (pigment anterior to Schwalbe's line).");
      els.exploreList.innerHTML = lines;
      els.exploreExtras.innerHTML = extras.length ? extras.map(function (e) { return "<li>" + e + "</li>"; }).join("") : "";
      els.exploreGrades.textContent = "Shaffer grade " + Gonio.shaffer(hourData).grade + " (" + Gonio.shaffer(hourData).label + ")  •  Spaeth " + Gonio.spaethNotation(hourData);
    }

    if (state.mode === "label") {
      renderLabelQuiz(hourData);
    }

    if (state.mode === "grading") {
      renderGradingQuiz(hourData);
    }
  }

  /* ---------------- Label quiz ---------------- */
  function renderLabelQuiz(hourData) {
    els.labelScore.textContent = "Score: " + state.score.label.correct + " / " + state.score.label.total;
    els.labelPrompt.textContent = state.labelTarget
      ? "Click the structure highlighted, or choose it below:"
      : "Click any labelled structure in the diagram to be quizzed on it.";
    els.labelOptions.innerHTML = "";
    if (!state.labelTarget) return;

    var visible = Gonio.visibleStructures(hourData).concat(state.labelTarget.id === "iris" ? ["iris"] : []);
    var pool = Gonio.STRUCTURES.filter(function (s) { return visible.indexOf(s.id) !== -1 || s.id === state.labelTarget.id; });
    // ensure at least 4 options by padding with any structures
    var extraPool = Gonio.STRUCTURES.filter(function (s) { return pool.indexOf(s) === -1; });
    while (pool.length < 4 && extraPool.length) pool.push(extraPool.shift());

    var options = shuffle(uniqueBy(pool.concat([Gonio.structureById(state.labelTarget.id)]), "id")).slice(0, 4);
    if (options.indexOf(Gonio.structureById(state.labelTarget.id)) === -1) options[0] = Gonio.structureById(state.labelTarget.id);
    options = shuffle(options);

    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt.label;
      btn.addEventListener("click", function () {
        state.score.label.total++;
        var correct = opt.id === state.labelTarget.id;
        if (correct) state.score.label.correct++;
        els.labelFeedback.textContent = correct
          ? "Correct — that is the " + opt.label + "."
          : "Not quite — that structure is the " + Gonio.structureById(state.labelTarget.id).label + ".";
        els.labelFeedback.className = correct ? "feedback correct" : "feedback incorrect";
        state.labelTarget = null;
        renderLabelQuiz(hourData);
        els.labelScore.textContent = "Score: " + state.score.label.correct + " / " + state.score.label.total;
      });
      els.labelOptions.appendChild(btn);
    });
  }

  function uniqueBy(arr, key) {
    var seen = {}, out = [];
    arr.forEach(function (item) {
      if (!seen[item[key]]) { seen[item[key]] = true; out.push(item); }
    });
    return out;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function handleStructureClick(evt) {
    if (justDragged) { justDragged = false; return; }
    if (state.mode !== "label") return;
    var target = evt.target.closest ? evt.target.closest("[data-structure]") : null;
    if (!target) return;
    var id = target.getAttribute("data-structure");
    var hourData = currentHourData();
    var visible = Gonio.visibleStructures(hourData);
    if (id !== "iris" && visible.indexOf(id) === -1) return; // can't quiz on a hidden structure
    state.labelTarget = { id: id };
    els.labelFeedback.textContent = "";
    els.labelFeedback.className = "feedback";
    renderLabelQuiz(hourData);
  }

  /* ---------------- Grading quiz ---------------- */
  function renderGradingQuiz(hourData) {
    els.gradingScore.textContent = "Score: " + state.score.grading.correct + " / " + state.score.grading.total;
    els.gradingFeedback.textContent = "";
    els.gradingFeedback.className = "feedback";
    els.shafferOptions.innerHTML = "";
    [4, 3, 2, 1, 0].forEach(function (g) {
      var btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = "Grade " + g;
      btn.addEventListener("click", function () { checkShaffer(g, hourData); });
      els.shafferOptions.appendChild(btn);
    });
  }

  function checkShaffer(guess, hourData) {
    var actual = Gonio.shaffer(hourData).grade;
    state.score.grading.total++;
    var correct = guess === actual;
    if (correct) state.score.grading.correct++;
    els.gradingFeedback.textContent = correct
      ? "Correct — Shaffer grade " + actual + " (" + Gonio.shaffer(hourData).label + "). Spaeth notation: " + Gonio.spaethNotation(hourData) + "."
      : "Not quite — this is Shaffer grade " + actual + " (" + Gonio.shaffer(hourData).label + "). Spaeth notation: " + Gonio.spaethNotation(hourData) + ".";
    els.gradingFeedback.className = correct ? "feedback correct" : "feedback incorrect";
    els.gradingScore.textContent = "Score: " + state.score.grading.correct + " / " + state.score.grading.total;
  }

  /* ---------------- continuous drag-to-rotate on the main viewport ---------------- */
  var DRAG_SENSITIVITY = 0.025; // hours per pixel of horizontal drag

  function attachDrag(svgEl) {
    svgEl.addEventListener("pointerdown", function (e) {
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      dragState = { startX: e.clientX, startHour: state.continuousHour, moved: false };
      svgEl.setPointerCapture(e.pointerId);
    });
    svgEl.addEventListener("pointermove", function (e) {
      if (!dragState) return;
      var dx = e.clientX - dragState.startX;
      if (Math.abs(dx) > 3) dragState.moved = true;
      state.continuousHour = Gonio.wrapHour(dragState.startHour + dx * DRAG_SENSITIVITY);
      renderAll();
    });
    svgEl.addEventListener("pointerup", function () {
      if (dragState && dragState.moved) justDragged = true;
      dragState = null;
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    els.angleSvg = q("angle-svg");
    els.dialSvg = q("dial-svg");
    els.caseSelect = q("case-select");
    els.caseDesc = q("case-desc");
    els.hourReadout = q("hour-readout");
    els.prevHour = q("prev-hour");
    els.nextHour = q("next-hour");
    els.modeTabs = document.querySelectorAll(".mode-tab");

    els.explorePanel = q("explore-panel");
    els.exploreList = q("explore-list");
    els.exploreExtras = q("explore-extras");
    els.exploreGrades = q("explore-grades");

    els.labelPanel = q("label-panel");
    els.labelPrompt = q("label-prompt");
    els.labelOptions = q("label-options");
    els.labelFeedback = q("label-feedback");
    els.labelScore = q("label-score");

    els.gradingPanel = q("grading-panel");
    els.shafferOptions = q("shaffer-options");
    els.gradingFeedback = q("grading-feedback");
    els.gradingScore = q("grading-score");

    Gonio.CASES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      els.caseSelect.appendChild(opt);
    });
    els.caseSelect.value = state.caseId;
    els.caseSelect.addEventListener("change", function () {
      state.caseId = els.caseSelect.value;
      state.labelTarget = null;
      renderAll();
    });

    els.prevHour.addEventListener("click", function () {
      var target = state.hour === 1 ? 12 : state.hour - 1;
      state.labelTarget = null;
      animateToHour(target);
    });
    els.nextHour.addEventListener("click", function () {
      var target = state.hour === 12 ? 1 : state.hour + 1;
      state.labelTarget = null;
      animateToHour(target);
    });

    els.modeTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        state.mode = tab.getAttribute("data-mode");
        state.labelTarget = null;
        els.modeTabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
        renderAll();
      });
    });

    attachDrag(els.angleSvg);
    els.angleSvg.addEventListener("click", handleStructureClick);

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
