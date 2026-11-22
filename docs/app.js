(function () {
  "use strict";
  var C = window.PassportCore;
  var COLORS = { 1: "var(--p1)", 2: "var(--p2)", 3: "var(--p3)" };
  var NAMES = { 1: "Period 1 · Curvature", 2: "Period 2 · Evolutes, envelopes, pedals", 3: "Period 3 · Several variables" };
  var MIN_WORK = 25;
  var HINTS = {
    "1.0": "Look at the four dials and the three pictures. In the parabola picture, drag the crosshair to the point at height y = a: the x-coordinate there is 2a. The ellipse crosses the x-axis at ±A and the y-axis at ±B. An arch of the cycloid is 2c high.",
    "1.1": "For y = f(x):  ρ = (1 + y₁²)^(3/2) / |y₂|.  Find y₁ and y₂ at P first.",
    "1.2": "α = x − y₁(1 + y₁²)/y₂,   β = y + (1 + y₁²)/y₂.",
    "1.3": "The circle has centre (α, β) and radius ρ. Expand (x − α)² + (y − β)² = ρ² and compare.",
    "1.4": "Parametric form:  ρ = (x′² + y′²)^(3/2) / |x′y″ − y′x″|, derivatives with respect to θ.",
    "1.5": "Polar form:  ρ = (r² + r′²)^(3/2) / |r² + 2r′² − r·r″|, derivatives with respect to θ. Find r′ and r″ in terms of r.",
    "2.1": "Centre of curvature, parametric:  α = x − y′(x′² + y′²)/(x′y″ − y′x″),  β = y + x′(x′² + y′²)/(x′y″ − y′x″).",
    "2.2": "The length of an arc of the evolute equals the difference of the radii of curvature at its ends. Find ρ at θ = 0 and at θ = π/2.",
    "2.3": "For this cycloid ρ = 4a·sin(t/2). Square it and use sin²(t/2) = (1 − cos t)/2. The evolute is a congruent cycloid, shifted.",
    "2.4": "Write q = (sum) − p, differentiate F(x, y, p) = 0 with respect to p, then eliminate p.",
    "2.5": "Differentiate F(x, y, m) = y − mx − c/m with respect to m, solve for x, then substitute back for y.",
    "2.6": "Pedal equation: find the angle φ between the radius vector and the tangent, then p = r sin φ.",
    "3.1": "Hold the other variable constant while you differentiate, then substitute the point.",
    "3.2": "f is homogeneous: count the degree n. Euler's theorem at second order gives n(n − 1)f.",
    "3.3": "J = u_x·v_y − u_y·v_x, evaluated at the given point.",
    "3.4": "Coefficient of (x−a)² is f_xx/2!, of (x−a)(y−b) is f_xy. Differentiate, then substitute (a, b).",
    "3.5": "Solve g_x = g_y = 0. At each critical point test rt − s² (with r = g_xx, s = g_xy, t = g_yy) and the sign of r.",
    "3.6": "L = x² + y² − λ(Ax + By − C). Solve L_x = L_y = 0 together with the constraint."
  };

  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function $(id) { return document.getElementById(id); }

  var S = { reg: null, tasks: null, save: null, period: 1, timer: null, left: 3000, salt: null, open: false, name: "", email: null, ident: null, dob: "" };
  function storeKey() { return (S.open ? "passport-open:" : "passport:") + (S.ident || S.reg); }
  function who() { return S.ident || S.reg; }

  /* ---------- persistence ---------- */
  function load() {
    try { S.save = JSON.parse(localStorage.getItem(storeKey())) || null; } catch (e) { S.save = null; }
    if (!S.save) S.save = { solved: {}, work: {}, tries: {}, bonus: "" };
  }
  function persist() { try { localStorage.setItem(storeKey(), JSON.stringify(S.save)); } catch (e) {} }

  /* ---------- login ---------- */
  var fails = 0, lockUntil = 0;
  function login() {
    var reg = C.normReg($("reg").value), msg = $("loginmsg"), needDob = !!(window.PASSPORT && window.PASSPORT.dob);
    msg.textContent = "";
    if (!window.PASSPORT) { msg.textContent = "data.js is missing. Ask your instructor."; return; }
    if (Date.now() < lockUntil) { msg.textContent = "Wait a few seconds before trying again."; return; }
    var dob = needDob ? C.normDob($("dob").value) : "";
    if (needDob && !dob) { msg.textContent = "Enter your date of birth as DD/MM/YYYY (for example 05/10/2005)."; return; }
    var ident = C.identOf(reg, dob), rec = reg ? window.PASSPORT.students[C.studentKey(window.PASSPORT_SALT, ident)] : null;
    function bad() { fails++; lockUntil = Date.now() + Math.min(30, fails * 3) * 1000; msg.textContent = needDob ? "Register number and date of birth do not match the class list. Check both, or use Practice mode below." : "This register number is not on the class list. Check it and try again, or use Practice mode below."; $("go").disabled = false; }
    if (!rec) { bad(); return; }
    $("go").disabled = true; msg.textContent = "Opening your passport...";
    var ready = needDob ? C.decryptRecord(window.PASSPORT_SALT, ident, rec) : Promise.resolve(rec);
    ready.then(function (tasks) {
      fails = 0; msg.textContent = "";
      S.reg = reg; S.dob = dob; S.ident = ident; S.tasks = tasks; S.salt = window.PASSPORT_SALT; S.open = false; S.name = ""; load();
      $("login").hidden = true; $("app").hidden = false; $("go").disabled = false;
      $("who").textContent = reg;
      if (window.PassportLive) window.PassportLive.start(C.studentKey(window.PASSPORT_SALT, ident), S.save.solved, S.save.tries);
      buildTabs(); showPeriod(1); buildSheet();
    }, function (e) {
      if (e && e.message === "nocrypto") { msg.textContent = "This browser cannot open the encrypted passport. Use Chrome, Edge or Safari on an https:// page."; $("go").disabled = false; }
      else bad();
    });
  }
  /* practice mode: any register number, problems built in the browser, never marked, never sent anywhere */
  function openLogin() {
    var reg = C.normReg($("reg").value), msg = $("loginmsg");
    msg.textContent = "";
    if (!window.PassportOpen) { msg.textContent = "Practice mode is not available on this page."; return; }
    if (!window.PassportOpen.validReg(reg)) { msg.textContent = "Type your register number or roll number first (letters and digits, 4 to 30 characters)."; return; }
    if (window.PASSPORT && !window.PASSPORT.dob && window.PASSPORT.students[C.studentKey(window.PASSPORT_SALT, reg)]) { msg.textContent = "This number is on the class list. Use the button \u201cOpen my passport\u201d so your work is marked."; return; }
    var ver = null;
    if (window.PassportAuth && window.PassportAuth.enabled()) {
      ver = window.PassportAuth.verified();
      if (!ver) { msg.textContent = "Verify your email first: type it in the box below and press \u201cSend me a sign-in link\u201d."; $("openbox").open = true; return; }
    }
    S.email = ver;
    S.ident = null; S.dob = ""; S.reg = reg; S.open = true; S.salt = window.PassportOpen.OPEN_SALT; S.tasks = window.PassportOpen.make(reg);
    S.name = ($("pname").value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 60);
    load();
    $("login").hidden = true; $("app").hidden = false;
    $("who").textContent = reg + " \u00b7 PRACTICE MODE";
    buildTabs(); showPeriod(1); buildSheet();
  }
  function logout() { stopAnim(); if (window.PassportViz) window.PassportViz.stopAll(); if (window.PassportLive && !S.open) window.PassportLive.stop(); S.open = false; S.reg = null; S.ident = null; S.dob = ""; S.tasks = null; if ($("dob")) $("dob").value = ""; $("app").hidden = true; $("login").hidden = false; $("reg").value = ""; clearInterval(S.timer); }

  /* ---------- progress ---------- */
  function partsOf(p) {
    var out = [];
    S.tasks.filter(function (t) { return t.period === p; }).forEach(function (t) {
      t.answers.forEach(function (a, i) { out.push(t.id + ":" + i); });
    });
    return out;
  }
  function solvedIn(p) { return partsOf(p).filter(function (k) { return S.save.solved[k] != null; }); }
  function stampFor(p) {
    var ent = solvedIn(p).map(function (k) { return k + "=" + S.save.solved[k]; });
    return C.stamp(S.salt, who(), p, ent);
  }

  function buildTabs() {
    var box = $("tabs"); box.innerHTML = "";
    [1, 2, 3].forEach(function (p) {
      var done = solvedIn(p).length, all = partsOf(p).length;
      var b = h("button", { class: "tab" + (S.period === p ? " on" : ""), style: "--c:" + COLORS[p], onclick: function () { showPeriod(p); } }, [
        h("b", { text: NAMES[p] }), h("small", { text: done + " of " + all + " answers confirmed" }),
        h("div", { class: "bar" }, [h("i", { style: "width:" + Math.round(100 * done / all) + "%" })])]);
      box.appendChild(b);
    });
    var total = [1, 2, 3].reduce(function (s, p) { return s + solvedIn(p).length; }, 0);
    var all = [1, 2, 3].reduce(function (s, p) { return s + partsOf(p).length; }, 0);
    $("progress").textContent = "· " + total + " of " + all + " answers confirmed";
  }

  /* ---------- period view ---------- */
  function showPeriod(p) {
    S.period = p; buildTabs();
    if (window.PassportViz) window.PassportViz.stopAll();
    var box = $("period"); box.innerHTML = "";
    box.appendChild(planCard(p));
    S.tasks.filter(function (t) { return t.period === p; }).forEach(function (t) { box.appendChild(taskCard(t)); });
    drawViz(); drawLab(); drawAnim(); buildSubmit();
    resetClock();
  }

  /* ---------- suggested time plan (estimates, not measurements) ---------- */
  var MINS = { "1.0": 6, "1.1": 6, "1.2": 5, "1.3": 4, "1.4": 8, "1.5": 8, "2.1": 9, "2.2": 5, "2.3": 7, "2.4": 8, "2.5": 6, "2.6": 10, "3.1": 5, "3.2": 4, "3.3": 4, "3.4": 8, "3.5": 8, "3.6": 6 };
  var PLAN = {
    1: { core: ["1.0", "1.1", "1.2", "1.3", "1.4"], opt: ["1.5"], lab: 8, nb: 6, fin: 0 },
    2: { core: ["2.1", "2.3", "2.4", "2.5"], opt: ["2.2", "2.6"], lab: 6, nb: 5, fin: 0 },
    3: { core: ["3.1", "3.2", "3.3", "3.4", "3.5"], opt: ["3.6"], lab: 6, nb: 5, fin: 3 }
  };
  function planCard(p) {
    var pl = PLAN[p], core = pl.core.reduce(function (s, id) { return s + MINS[id]; }, 0), total = 2 + core + pl.lab + pl.nb + pl.fin + 2;
    return h("div", { class: "card plan", style: "--c:" + COLORS[p] }, [
      h("div", { class: "topic", text: "Suggested plan for this period" }),
      h("div", { class: "small", text: "Start-up 2 min · core tasks " + core + " min · live lab " + pl.lab + " min · notebook " + pl.nb + " min" + (pl.fin ? " · final reflection " + pl.fin + " min" : "") + " · download and submit 2 min. That is about " + total + " of your 50 minutes." }),
      h("div", { class: "small", text: "Optional if time is short: " + pl.opt.join(", ") + ". Your progress is saved on this device, so you can finish them later and submit again." })]);
  }

  /* ---------- live lab + notebook (lab.js) ---------- */
  function taskDone(id) {
    var t = S.tasks.filter(function (x) { return x.id === id; })[0];
    return !!t && t.answers.every(function (a, i) { return S.save.solved[id + ":" + i] != null; });
  }
  function labCtx() { return { tasks: S.tasks, save: S.save, persist: persist, color: COLORS[S.period], done: taskDone, reg: S.reg, stamp: stampFor }; }
  function drawLab() {
    var box = $("labbox"); box.innerHTML = "";
    if (!window.PassportLab) return;
    window.PassportLab.render(S.period, box, labCtx());
  }

  /* ---------- animation card + animated report (report.js) ---------- */
  var anim = null;
  function stopAnim() { if (anim && anim.stop) anim.stop(); anim = null; }
  function drawAnim() {
    stopAnim();
    var box = $("animbox"); box.innerHTML = "";
    if (!window.PassportReport) return;
    try { anim = window.PassportReport.card(S.period, box, labCtx()); } catch (e) { box.innerHTML = ""; }
  }

  /* numbers the student finds in task 1.0 replace the symbols in later task texts */
  var TOK = { a: "1.0:1", A: "1.0:2", B: "1.0:3", c: "1.0:4" };
  function fillTokens(str) {
    return String(str).replace(/⟨(\w)⟩/g, function (m, k) {
      var v = S.save.solved[TOK[k]]; if (v == null) return k;
      var p = v.split("/"); return p[1] === "1" ? p[0] : v;
    });
  }
  function hasDiscovery() { return S.tasks.some(function (x) { return x.id === "1.0"; }); }
  function discoveryDone() { return !hasDiscovery() || taskDone("1.0"); }
  function stepsDone(t) { return (t.steps || []).every(function (a, i) { return S.save.solved[t.id + ":s" + i] != null; }); }
  function bk(t, kind, i) { return t.id + ":" + kind + i; }

  /* a list of numeric blanks (worksheet steps "s" or visualiser observations "o") */
  function blankBox(t, kind, list, title, note, after) {
    var tid = t.id + kind, box = h("div", { class: "parts blanks" }), ins = [];
    box.appendChild(h("div", { class: "topic", text: title }));
    if (note) box.appendChild(h("div", { class: "small", text: note }));
    list.forEach(function (a, i) {
      var key = bk(t, kind, i), inp = h("input", { type: "text", autocomplete: "off", placeholder: "fraction or decimal", "aria-label": a.label });
      var wrap = h("div", { class: "part" }, [h("label", { text: a.label }), inp]);
      if (S.save.solved[key] != null) { inp.value = S.save.solved[key]; inp.disabled = true; wrap.classList.add("ok"); }
      ins.push(inp); box.appendChild(wrap);
    });
    var msg = h("div", { class: "msg", role: "status" });
    var allDone = list.every(function (a, i) { return S.save.solved[bk(t, kind, i)] != null; });
    var btn = h("button", { class: "ghost", text: allDone ? "Confirmed" : "Check these boxes", onclick: function () {
      var wrong = 0, bad = 0, fresh = 0;
      list.forEach(function (a, i) {
        var key = bk(t, kind, i); if (S.save.solved[key] != null) return;
        var canon = C.parseAnswer(ins[i].value);
        if (canon === null) { bad++; return; }
        if (C.answerHash(S.salt, who(), tid, i, canon) === a.h) { S.save.solved[key] = canon; fresh++; ins[i].value = canon; ins[i].disabled = true; ins[i].parentNode.classList.add("ok"); } else wrong++;
      });
      persist();
      if (bad) { msg.className = "msg bad"; msg.textContent = "Type each box as a fraction like 3/4 or a decimal like 0.75."; return; }
      var ok = list.every(function (a, i) { return S.save.solved[bk(t, kind, i)] != null; });
      if (ok) { after(); return; }
      msg.className = "msg bad";
      msg.textContent = (fresh ? "Some boxes are right (locked in green). " : "") + (wrong ? "The others do not match yet. Recheck your own numbers; they are different from your neighbour's." : "");
    } });
    if (allDone) btn.disabled = true;
    box.appendChild(h("div", { class: "row" }, [btn])); box.appendChild(msg);
    return box;
  }

  function taskCard(t) {
    var c = COLORS[t.period];
    var nOk = t.answers.filter(function (a, i) { return S.save.solved[t.id + ":" + i] != null; }).length;
    var full = nOk === t.answers.length;
    var card = h("div", { class: "card task" + (full ? " done" : ""), style: "--c:" + c, id: "task-" + t.id });
    card.appendChild(h("div", { class: "topic", text: t.id + " · " + t.topic }));
    card.appendChild(h("div", { class: "small", text: "about " + MINS[t.id] + " min" + (PLAN[t.period].opt.indexOf(t.id) >= 0 ? " · optional if you are short of time" : "") }));
    card.appendChild(h("h3", { text: t.title }));
    if (t.id !== "1.0" && !discoveryDone()) {
      card.appendChild(h("div", { class: "small", text: "Locked. Task 1.0 (your Number Machine) gives you the numbers used here. Finish it first, in Period 1." }));
      return card;
    }
    card.appendChild(h("div", { text: fillTokens(t.text) }));
    if (t.id === "1.0" && window.PassportDiscover) window.PassportDiscover.attach(card, t, { done: full });
    var steps = t.steps || [], ta = null;
    var needWork = !steps.length && t.id !== "1.0";
    var sDone = stepsDone(t);
    if (steps.length) {
      card.appendChild(blankBox(t, "s", steps, "Worksheet: fill in the missing boxes", "Do each line on paper, then type only the missing number. Green boxes are locked in.", function () { showPeriod(t.period); }));
      ta = h("textarea", { placeholder: "Extra notes (optional)", "aria-label": "Notes for " + t.id });
      ta.value = S.save.work[t.id] || "";
      ta.addEventListener("input", function () { S.save.work[t.id] = ta.value; persist(); });
      var det = h("details", { class: "small" }, [h("summary", { text: "Extra notes (optional)" }), ta]); card.appendChild(det);
    } else if (needWork) {
      ta = h("textarea", { placeholder: "Your working: the formula you used, the derivatives, the substitution. At least a few lines.", "aria-label": "Working for " + t.id });
      ta.value = S.save.work[t.id] || "";
      ta.addEventListener("input", function () { S.save.work[t.id] = ta.value; persist(); });
      card.appendChild(h("div", { class: "small", style: "margin-top:10px", text: "Show your working first (the answer boxes check only after you have written some)." }));
      card.appendChild(ta);
    }
    var parts = h("div", { class: "parts" });
    var inputs = [];
    var locked = steps.length && !sDone;
    if (steps.length) parts.appendChild(h("div", { class: "topic", text: locked ? "Final answer (opens when the worksheet boxes are right)" : "Final answer" }));
    t.answers.forEach(function (a, i) {
      var key = t.id + ":" + i, inp = h("input", { type: "text", autocomplete: "off", inputmode: "text", placeholder: "fraction or decimal" });
      var wrap = h("div", { class: "part" }, [h("label", { text: a.label }), inp]);
      if (S.save.solved[key] != null) { inp.value = S.save.solved[key]; inp.disabled = true; wrap.classList.add("ok"); }
      else if (locked) inp.disabled = true;
      inputs.push(inp); parts.appendChild(wrap);
    });
    card.appendChild(parts);
    var msg = h("div", { class: "msg", role: "status" });
    var hint = h("div", { class: "hint", hidden: "" });
    var btn = h("button", { text: "Check my answer", onclick: function () { check(t, inputs, ta, msg, hint, needWork); } });
    if (full) { btn.disabled = true; btn.textContent = "Confirmed"; } else if (locked) btn.disabled = true;
    card.appendChild(h("div", { class: "row" }, [btn]));
    card.appendChild(msg); card.appendChild(hint);
    if ((S.save.tries[t.id] || 0) >= 2 && !full) { hint.textContent = "Hint: " + HINTS[t.id]; hint.hidden = false; }
    if (window.PassportViz && t.viz && t.viz.kind !== "discover") window.PassportViz.attach(card, t, full);
    if (full && (t.obs || []).length) {
      card.appendChild(blankBox(t, "o", t.obs, "Your observations from the visualiser", "Play with your own visualiser above (or work it out), then type what you found. These numbers belong to your parameters only.", function () { showPeriod(t.period); }));
    }
    return card;
  }

  function check(t, inputs, ta, msg, hint, needWork) {
    if (needWork && (ta.value || "").replace(/\s+/g, " ").trim().length < MIN_WORK) {
      msg.className = "msg bad"; msg.textContent = "Write your working in the box first. A few lines is enough."; return;
    }
    var wrong = 0, bad = 0, fresh = 0;
    t.answers.forEach(function (a, i) {
      var key = t.id + ":" + i, inp = inputs[i];
      if (S.save.solved[key] != null) return;
      var canon = C.parseAnswer(inp.value);
      if (canon === null) { bad++; return; }
      if (C.answerHash(S.salt, who(), t.id, i, canon) === a.h) {
        S.save.solved[key] = canon; fresh++;
        if (window.PassportLive && !S.open) window.PassportLive.solved(key);
      } else wrong++;
    });
    if (bad) { msg.className = "msg bad"; msg.textContent = "Enter each answer as a fraction like 3/4 or a terminating decimal like 0.75."; return; }
    if (wrong || fresh) S.save.tries[t.id] = (S.save.tries[t.id] || 0) + (wrong ? 1 : 0);
    if (wrong && window.PassportLive && !S.open) window.PassportLive.tries(t.id, S.save.tries[t.id]);
    persist();
    var allOk = t.answers.every(function (a, i) { return S.save.solved[t.id + ":" + i] != null; });
    if (allOk) { showPeriod(t.period); var el = $("task-" + t.id); if (el) { var m = el.querySelector(".msg"); m.className = "msg ok"; m.textContent = "Confirmed. Your working and answer are saved."; } return; }
    msg.className = "msg bad";
    msg.textContent = fresh ? "Some parts are confirmed, but not all. Recheck the others and try again." : "Not matching yet. Recheck your working line by line.";
    if (fresh) {
      t.answers.forEach(function (a, i) {
        if (S.save.solved[t.id + ":" + i] != null) { inputs[i].value = S.save.solved[t.id + ":" + i]; inputs[i].disabled = true; inputs[i].parentNode.classList.add("ok"); }
      });
      buildTabs(); drawViz(); drawLab(); drawAnim(); buildSubmit();
    }
    if ((S.save.tries[t.id] || 0) >= 2) { hint.textContent = "Hint: " + HINTS[t.id]; hint.hidden = false; }
    if ((S.save.tries[t.id] || 0) >= 4) hint.textContent += "   Still stuck? Show your working to your instructor.";
  }

  /* ---------- visuals drawn from the student's own confirmed answers ---------- */
  function num(canon) { var p = canon.split("/"); return Number(p[0]) / Number(p[1]); }
  function fr(s) { var p = String(s).split("/"); return p.length > 1 ? Number(p[0]) / Number(p[1]) : Number(p[0]); }
  function ink() { return getComputedStyle(document.body).color; }
  function line() { return getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#ccc"; }

  function drawViz() {
    var box = $("vizbox"); box.innerHTML = "";
    var want = { 1: "1.2", 2: "2.1", 3: "3.5" }[S.period];
    var t = S.tasks.filter(function (x) { return x.id === want; })[0];
    if (!t || !t.viz) return;
    var ok = t.answers.every(function (a, i) { return S.save.solved[t.id + ":" + i] != null; });
    var card = h("div", { class: "card", style: "--c:" + COLORS[S.period] });
    card.appendChild(h("div", { class: "topic", text: "Tutorial · visualise your own result" }));
    if (!ok) { card.appendChild(h("div", { class: "small", text: "Confirm task " + want + " to unlock a picture of your own curve." })); box.appendChild(card); return; }
    var cv = h("canvas", { width: "560", height: "420", role: "img", "aria-label": "Your personal curve" });
    card.appendChild(cv);
    var v = t.viz, s0 = S.save.solved;
    if (v.kind === "parab") {
      var one = S.save.solved["1.1:0"];
      card.appendChild(h("div", { class: "small", text: one ? "Your parabola, the point P, and the circle of curvature built from your own α, β and ρ." : "Your parabola, point P and your centre of curvature. Confirm task 1.1 to add the circle." }));
      drawParab(cv, v, num(s0["1.2:0"]), num(s0["1.2:1"]), one ? num(one) : null);
    } else if (v.kind === "ellipse") {
      card.appendChild(h("div", { class: "small", text: "Your ellipse, a point P on it, and the point of the evolute (your α, β) that belongs to P. The segment is the radius of curvature." }));
      drawEllipse(cv, v, num(s0["2.1:0"]), num(s0["2.1:1"]));
    } else if (v.kind === "surface") {
      card.appendChild(h("div", { class: "small", text: "Heat map of your surface g(x, y). Light = high, dark = low. Circles: your local minimum and maximum. Squares: the other critical points." }));
      drawSurface(cv, v);
    }
    box.appendChild(card);
  }

  function frame(cv, x0, x1, y0, y1) {
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, pad = 24;
    ctx.clearRect(0, 0, W, H);
    var sx = (W - 2 * pad) / (x1 - x0), sy = (H - 2 * pad) / (y1 - y0), s = Math.min(sx, sy);
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var X = function (x) { return W / 2 + (x - cx) * s; }, Y = function (y) { return H / 2 - (y - cy) * s; };
    ctx.strokeStyle = line(); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
    return { ctx: ctx, X: X, Y: Y, s: s };
  }
  function dot(f, x, y, col, label) {
    f.ctx.fillStyle = col; f.ctx.beginPath(); f.ctx.arc(f.X(x), f.Y(y), 4.5, 0, 7); f.ctx.fill();
    if (label) { f.ctx.fillStyle = ink(); f.ctx.font = "13px system-ui"; f.ctx.fillText(label, f.X(x) + 8, f.Y(y) - 8); }
  }
  function drawParab(cv, v, al, be, rho) {
    var a = v.a, x0 = fr(v.x0), y0 = fr(v.y0), R = rho || 0;
    var minx = Math.min(-Math.abs(x0) - 1, al - R - 0.5), maxx = Math.max(Math.abs(x0) + 1, al + R + 0.5);
    var miny = Math.min(0, be - R) - 0.5, maxy = Math.max(y0, be + R) + 0.5;
    var f = frame(cv, minx, maxx, miny, maxy), c = f.ctx;
    c.strokeStyle = "#1f6f8b"; c.lineWidth = 2.2; c.beginPath();
    for (var x = minx; x <= maxx; x += (maxx - minx) / 300) { var y = x * x / (4 * a); (x === minx ? c.moveTo : c.lineTo).call(c, f.X(x), f.Y(y)); }
    c.stroke();
    if (rho) { c.strokeStyle = "#b4442b"; c.lineWidth = 2; c.beginPath(); c.arc(f.X(al), f.Y(be), rho * f.s, 0, 7); c.stroke(); }
    c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(f.X(x0), f.Y(y0)); c.lineTo(f.X(al), f.Y(be)); c.stroke(); c.setLineDash([]);
    dot(f, x0, y0, "#1f6f8b", "P"); dot(f, al, be, "#b4442b", "centre");
  }
  function drawEllipse(cv, v, al, be) {
    var A = v.A, B = v.B, m = Math.max(A, B) * 1.15, px = A * fr(v.c), py = B * fr(v.s);
    var ext = Math.max(m, Math.abs(al) * 1.1, Math.abs(be) * 1.1);
    var f = frame(cv, -ext, ext, -ext, ext), c = f.ctx;
    c.strokeStyle = "#7a4fa3"; c.lineWidth = 2.2; c.beginPath();
    for (var i = 0; i <= 240; i++) { var t = i / 240 * 2 * Math.PI; (i ? c.lineTo : c.moveTo).call(c, f.X(A * Math.cos(t)), f.Y(B * Math.sin(t))); }
    c.stroke();
    c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(f.X(px), f.Y(py)); c.lineTo(f.X(al), f.Y(be)); c.stroke(); c.setLineDash([]);
    dot(f, px, py, "#7a4fa3", "P"); dot(f, al, be, "#b4442b", "evolute point");
  }
  function drawSurface(cv, v) {
    var al = v.al, be = v.be, p = v.p, q = v.q, K = v.K, W = cv.width, H = cv.height, ctx = cv.getContext("2d");
    var R = Math.max(p, q) * 1.8, g = function (x, y) { return al * x * x * x + be * y * y * y - 3 * al * p * p * x - 3 * be * q * q * y + K; };
    var img = ctx.createImageData(W, H), lo = 1e18, hi = -1e18, vals = new Float32Array(W * H), i, j;
    for (j = 0; j < H; j++) for (i = 0; i < W; i++) {
      var x = -R + 2 * R * i / (W - 1), y = R - 2 * R * j / (H - 1), z = g(x, y);
      vals[j * W + i] = z;
    }
    var sorted = Array.prototype.slice.call(vals).sort(function (a, b) { return a - b; });
    lo = sorted[Math.floor(sorted.length * 0.02)]; hi = sorted[Math.floor(sorted.length * 0.98)];
    for (i = 0; i < vals.length; i++) {
      var tt = Math.max(0, Math.min(1, (vals[i] - lo) / (hi - lo))), k = i * 4;
      img.data[k] = 30 + 200 * tt; img.data[k + 1] = 40 + 170 * tt * tt + 30 * tt; img.data[k + 2] = 110 + 100 * (1 - tt) * tt * 2 + 40 * tt; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var X = function (x) { return (x + R) / (2 * R) * (W - 1); }, Y = function (y) { return (R - y) / (2 * R) * (H - 1); };
    function mark(x, y, fill, sq, label) {
      ctx.fillStyle = fill; ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
      ctx.beginPath(); if (sq) ctx.rect(X(x) - 6, Y(y) - 6, 12, 12); else ctx.arc(X(x), Y(y), 7, 0, 7); ctx.fill(); ctx.stroke();
      if (label) { ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.fillText(label, X(x) + 11, Y(y) - 9); }
    }
    mark(p, -q, "#bbb", true); mark(-p, q, "#bbb", true);
    mark(p, q, "#ffd34d", false, "min"); mark(-p, -q, "#ff7a59", false, "max");
  }

  /* ---------- submission ---------- */
  function submissionText() {
    var out = ["CALCULUS PASSPORT SUBMISSION", "Register number: " + S.reg].concat(S.dob ? ["Date of birth: " + S.dob.slice(0, 2) + "/" + S.dob.slice(2, 4) + "/" + S.dob.slice(4)] : []).concat(S.open ? ["MODE: PRACTICE (not on the class list, not marked)", "Name: " + (S.name || "(not given)")].concat(S.email ? ["Email: " + S.email.email, "EMAIL-VERIFIED: yes", "EMAIL-TOKEN: " + S.email.token] : []) : []).concat(["Created: " + new Date().toISOString(), ""]);
    [1, 2, 3].forEach(function (p) {
      out.push("STAMP P" + p + " " + stampFor(p) + "   (" + solvedIn(p).length + "/" + partsOf(p).length + " answers confirmed)");
    });
    out.push("");
    S.tasks.forEach(function (t) {
      out.push("TASK " + t.id + " | " + t.title + " | wrong attempts: " + (S.save.tries[t.id] || 0));
      t.answers.forEach(function (a, i) { var k = t.id + ":" + i; if (S.save.solved[k] != null) out.push("ANSWER " + k + " = " + S.save.solved[k]); });
      (t.steps || []).forEach(function (a, i) { var k = t.id + ":s" + i; if (S.save.solved[k] != null) out.push("STEP " + k + " = " + S.save.solved[k]); });
      (t.obs || []).forEach(function (a, i) { var k = t.id + ":o" + i; if (S.save.solved[k] != null) out.push("OBS " + k + " = " + S.save.solved[k]); });
      out.push("WORKING:"); out.push((S.save.work[t.id] || "(none)").replace(/\r/g, "")); out.push("");
    });
    out.push("BONUS PROBLEM:"); out.push(S.save.bonus || "(none)");
    out.push("");
    if (window.PassportLab) window.PassportLab.submissionLines(S.save).forEach(function (l) { out.push(l); });
    return out.join("\n");
  }
  function buildSubmit() {
    var box = $("submitbox"); box.innerHTML = "";
    var p = S.period;
    box.style.setProperty("--c", COLORS[p]);
    box.appendChild(h("div", { class: "topic", text: "Your passport stamp · " + NAMES[p] }));
    box.appendChild(h("div", { class: "stamp", text: solvedIn(p).length ? stampFor(p) : "no answers confirmed yet" }));
    box.appendChild(h("div", { class: "small", text: "The stamp is computed from your confirmed answers, so it changes whenever you confirm another one. Submit the file below at the end of the period." }));
    if (p === 3) {
      box.appendChild(h("div", { style: "margin-top:12px" }, [h("b", { text: "Bonus (optional): set a problem for your neighbour" })]));
      var bt = h("textarea", { placeholder: "Write a curvature, envelope or extremum problem with its answer. Make the answer a neat fraction." });
      bt.value = S.save.bonus || ""; bt.addEventListener("input", function () { S.save.bonus = bt.value; persist(); });
      box.appendChild(bt);
    }
    box.appendChild(h("div", { class: "row", style: "margin-top:10px" }, [
      h("button", { text: "Download my submission", onclick: function () {
        var blob = new Blob([submissionText()], { type: "text/plain" }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "passport_" + S.reg + ".txt"; document.body.appendChild(a); a.click(); a.remove();
      } }),
      h("button", { class: "ghost", text: "Print my problem sheet", onclick: function () { window.print(); } }),
      h("button", { class: "ghost", text: "Download my animated report", onclick: function () { if (window.PassportReport) window.PassportReport.download(labCtx()); } })]));
    box.appendChild(h("div", { class: "small", style: "margin-top:6px", text: "Submit both files: the submission file (marked) and the animated report (a one-file replay of your own demonstration, readings and notebook)." }));
  }

  function buildSheet() {
    var sh = $("sheet"); sh.innerHTML = "";
    sh.appendChild(h("h2", { text: "Calculus Passport · " + S.reg }));
    S.tasks.forEach(function (t) {
      sh.appendChild(h("div", { class: "t" }, [h("b", { text: t.id + "  " + t.title }), h("div", { text: fillTokens(t.text) }), h("div", { class: "lines" })]));
    });
  }

  /* ---------- 50-minute timer ---------- */
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  function resetClock() { if (S.timer) return; $("clock").textContent = fmt(S.left); }
  function toggleClock() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; $("clockbtn").textContent = "Resume timer"; return; }
    $("clockbtn").textContent = "Pause timer";
    S.timer = setInterval(function () { S.left = Math.max(0, S.left - 1); $("clock").textContent = fmt(S.left); if (!S.left) { clearInterval(S.timer); S.timer = null; $("clockbtn").textContent = "Time is up"; } }, 1000);
  }

  /* ---------- verified email (practice mode) ---------- */
  (function authUi() {
    var A = window.PassportAuth; if (!A || !A.enabled()) return;
    var box = $("authbox"), msg = $("authmsg"), em = $("pemail"), sendB = $("sendlink"), finB = $("finishlink");
    box.hidden = false;
    function say(t, ok) { msg.textContent = t; msg.className = "msg " + (ok ? "ok" : "bad"); }
    function refresh() {
      var v = A.verified();
      if (v) { say("Email verified: " + v.email, true); em.value = v.email; em.disabled = true; sendB.hidden = true; finB.hidden = true; }
    }
    sendB.addEventListener("click", function () {
      sendB.disabled = true; say("Sending...", true);
      A.send(em.value, { reg: $("reg").value, name: $("pname").value }).then(function (e) { say("Link sent to " + e + ". Open it from your inbox (check spam). It opens this page.", true); },
        function (err) { say(err.message, false); }).then(function () { setTimeout(function () { sendB.disabled = false; }, 15000); });
    });
    function finish(email, oob) {
      say("Confirming...", true);
      A.complete(email, oob).then(function () {
        refresh(); var p = A.pending();
        $("openbox").open = true; say("Email verified. Now press \u201cOpen practice passport\u201d.", true);
      }, function (err) { say(err.message, false); finB.hidden = false; });
    }
    var oob = A.linkInUrl();
    if (oob) {
      $("openbox").open = true;
      var p = A.pending();
      if (p && p.extra) { $("reg").value = p.extra.reg || ""; $("pname").value = p.extra.name || ""; }
      if (p && p.email) { em.value = p.email; finish(p.email, oob); }
      else { say("Type the same email address you used, then press \u201cFinish sign-in\u201d.", true); finB.hidden = false; sendB.hidden = true; }
      finB.addEventListener("click", function () { finish(em.value, oob); });
    } else refresh();
  })();

  if (window.PASSPORT && window.PASSPORT.dob) $("dobrow").hidden = false;
  if (window.PassportLive && window.PassportLive.enabled()) $("livenote").hidden = false;
  $("go").addEventListener("click", login);
  $("opengo").addEventListener("click", openLogin);
  $("reg").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  if ($("dob")) $("dob").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  $("out").addEventListener("click", logout);
  $("clockbtn").addEventListener("click", toggleClock);
})();
