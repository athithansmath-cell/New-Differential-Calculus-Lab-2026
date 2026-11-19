(function () {
  "use strict";
  var C = window.PassportCore;
  var COLORS = { 1: "var(--p1)", 2: "var(--p2)", 3: "var(--p3)" };
  var NAMES = { 1: "Period 1 · Curvature", 2: "Period 2 · Evolutes, envelopes, pedals", 3: "Period 3 · Several variables" };
  var MIN_WORK = 25;
  var HINTS = {
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

  var S = { reg: null, tasks: null, save: null, period: 1, timer: null, left: 3000 };

  /* ---------- persistence ---------- */
  function load() {
    try { S.save = JSON.parse(localStorage.getItem("passport:" + S.reg)) || null; } catch (e) { S.save = null; }
    if (!S.save) S.save = { solved: {}, work: {}, tries: {}, bonus: "" };
  }
  function persist() { try { localStorage.setItem("passport:" + S.reg, JSON.stringify(S.save)); } catch (e) {} }

  /* ---------- login ---------- */
  function login() {
    var reg = C.normReg($("reg").value);
    $("loginmsg").textContent = "";
    if (!window.PASSPORT) { $("loginmsg").textContent = "data.js is missing. Ask your instructor."; return; }
    var tasks = window.PASSPORT.students[C.studentKey(window.PASSPORT_SALT, reg)];
    if (!reg || !tasks) { $("loginmsg").textContent = "This register number is not on the class list. Check it and try again."; return; }
    S.reg = reg; S.tasks = tasks; load();
    $("login").hidden = true; $("app").hidden = false;
    $("who").textContent = reg;
    if (window.PassportLive) window.PassportLive.start(C.studentKey(window.PASSPORT_SALT, reg), S.save.solved, S.save.tries);
    buildTabs(); showPeriod(1); buildSheet();
  }
  function logout() { if (window.PassportLive) window.PassportLive.stop(); S.reg = null; $("app").hidden = true; $("login").hidden = false; $("reg").value = ""; clearInterval(S.timer); }

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
    return C.stamp(window.PASSPORT_SALT, S.reg, p, ent);
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
    var box = $("period"); box.innerHTML = "";
    S.tasks.filter(function (t) { return t.period === p; }).forEach(function (t) { box.appendChild(taskCard(t)); });
    drawViz(); buildSubmit();
    resetClock();
  }

  function taskCard(t) {
    var c = COLORS[t.period];
    var nOk = t.answers.filter(function (a, i) { return S.save.solved[t.id + ":" + i] != null; }).length;
    var card = h("div", { class: "card task" + (nOk === t.answers.length ? " done" : ""), style: "--c:" + c, id: "task-" + t.id });
    card.appendChild(h("div", { class: "topic", text: t.id + " · " + t.topic }));
    card.appendChild(h("h3", { text: t.title }));
    card.appendChild(h("div", { text: t.text }));
    var ta = h("textarea", { placeholder: "Your working: the formula you used, the derivatives, the substitution. At least a few lines.", "aria-label": "Working for " + t.id });
    ta.value = S.save.work[t.id] || "";
    ta.addEventListener("input", function () { S.save.work[t.id] = ta.value; persist(); });
    card.appendChild(h("div", { class: "small", style: "margin-top:10px", text: "Show your working first (the answer boxes check only after you have written some)." }));
    card.appendChild(ta);
    var parts = h("div", { class: "parts" });
    var inputs = [];
    t.answers.forEach(function (a, i) {
      var key = t.id + ":" + i, inp = h("input", { type: "text", autocomplete: "off", inputmode: "text", placeholder: "fraction or decimal" });
      var wrap = h("div", { class: "part" }, [h("label", { text: a.label }), inp]);
      if (S.save.solved[key] != null) { inp.value = S.save.solved[key]; inp.disabled = true; wrap.classList.add("ok"); }
      inputs.push(inp); parts.appendChild(wrap);
    });
    card.appendChild(parts);
    var msg = h("div", { class: "msg", role: "status" });
    var hint = h("div", { class: "hint", hidden: "" });
    var btn = h("button", { text: "Check my answer", onclick: function () { check(t, inputs, ta, msg, hint); } });
    if (nOk === t.answers.length) { btn.disabled = true; btn.textContent = "Confirmed"; }
    card.appendChild(h("div", { class: "row" }, [btn]));
    card.appendChild(msg); card.appendChild(hint);
    if ((S.save.tries[t.id] || 0) >= 2 && nOk < t.answers.length) { hint.textContent = "Hint: " + HINTS[t.id]; hint.hidden = false; }
    return card;
  }

  function check(t, inputs, ta, msg, hint) {
    if ((ta.value || "").replace(/\s+/g, " ").trim().length < MIN_WORK) {
      msg.className = "msg bad"; msg.textContent = "Write your working in the box first. A few lines is enough."; return;
    }
    var wrong = 0, bad = 0, fresh = 0;
    t.answers.forEach(function (a, i) {
      var key = t.id + ":" + i, inp = inputs[i];
      if (S.save.solved[key] != null) return;
      var canon = C.parseAnswer(inp.value);
      if (canon === null) { bad++; return; }
      if (C.answerHash(window.PASSPORT_SALT, S.reg, t.id, i, canon) === a.h) {
        S.save.solved[key] = canon; fresh++;
        if (window.PassportLive) window.PassportLive.solved(key);
      } else wrong++;
    });
    if (bad) { msg.className = "msg bad"; msg.textContent = "Enter each answer as a fraction like 3/4 or a terminating decimal like 0.75."; return; }
    if (wrong || fresh) S.save.tries[t.id] = (S.save.tries[t.id] || 0) + (wrong ? 1 : 0);
    if (wrong && window.PassportLive) window.PassportLive.tries(t.id, S.save.tries[t.id]);
    persist();
    var allOk = t.answers.every(function (a, i) { return S.save.solved[t.id + ":" + i] != null; });
    if (allOk) { showPeriod(t.period); var el = $("task-" + t.id); if (el) { var m = el.querySelector(".msg"); m.className = "msg ok"; m.textContent = "Confirmed. Your working and answer are saved."; } return; }
    msg.className = "msg bad";
    msg.textContent = fresh ? "Some parts are confirmed, but not all. Recheck the others and try again." : "Not matching yet. Recheck your working line by line.";
    if (fresh) {
      t.answers.forEach(function (a, i) {
        if (S.save.solved[t.id + ":" + i] != null) { inputs[i].value = S.save.solved[t.id + ":" + i]; inputs[i].disabled = true; inputs[i].parentNode.classList.add("ok"); }
      });
      buildTabs(); drawViz(); buildSubmit();
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
    var out = ["CALCULUS PASSPORT SUBMISSION", "Register number: " + S.reg, "Created: " + new Date().toISOString(), ""];
    [1, 2, 3].forEach(function (p) {
      out.push("STAMP P" + p + " " + stampFor(p) + "   (" + solvedIn(p).length + "/" + partsOf(p).length + " answers confirmed)");
    });
    out.push("");
    S.tasks.forEach(function (t) {
      out.push("TASK " + t.id + " | " + t.title + " | wrong attempts: " + (S.save.tries[t.id] || 0));
      t.answers.forEach(function (a, i) { var k = t.id + ":" + i; if (S.save.solved[k] != null) out.push("ANSWER " + k + " = " + S.save.solved[k]); });
      out.push("WORKING:"); out.push((S.save.work[t.id] || "(none)").replace(/\r/g, "")); out.push("");
    });
    out.push("BONUS PROBLEM:"); out.push(S.save.bonus || "(none)");
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
      h("button", { class: "ghost", text: "Print my problem sheet", onclick: function () { window.print(); } })]));
  }

  function buildSheet() {
    var sh = $("sheet"); sh.innerHTML = "";
    sh.appendChild(h("h2", { text: "Calculus Passport · " + S.reg }));
    S.tasks.forEach(function (t) {
      sh.appendChild(h("div", { class: "t" }, [h("b", { text: t.id + "  " + t.title }), h("div", { text: t.text }), h("div", { class: "lines" })]));
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

  if (window.PassportLive && window.PassportLive.enabled()) $("livenote").hidden = false;
  $("go").addEventListener("click", login);
  $("reg").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  $("out").addEventListener("click", logout);
  $("clockbtn").addEventListener("click", toggleClock);
})();
