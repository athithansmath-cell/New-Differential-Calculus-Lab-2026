/* lab.js - Live Lab (interactive demo on each student's OWN curve or surface) + Lab Notebook.
   Everything stays in the student's browser and in the submission file. Nothing here is sent to Firebase. */
(function (root) {
  "use strict";
  var PI = Math.PI;

  /* ---------------- pure maths (also used by the tests) ---------------- */
  var M = {
    frac: function (s) { var p = String(s).split("/"); return p.length > 1 ? Number(p[0]) / Number(p[1]) : Number(p[0]); },
    parab: function (a, x) {                       /* x^2 = 4 a y */
      var y1 = x / (2 * a), y2 = 1 / (2 * a), y = x * x / (4 * a), s = 1 + y1 * y1;
      return { x: x, y: y, rho: Math.pow(s, 1.5) / y2, al: x - y1 * s / y2, be: y + s / y2 };
    },
    ellipse: function (A, B, th) {                 /* x = A cos th, y = B sin th */
      var x = A * Math.cos(th), y = B * Math.sin(th), x1 = -A * Math.sin(th), y1 = B * Math.cos(th);
      var x2 = -x, y2 = -y, den = x1 * y2 - y1 * x2, q = x1 * x1 + y1 * y1;
      return { x: x, y: y, rho: Math.pow(q, 1.5) / Math.abs(den), al: x - y1 * q / den, be: y + x1 * q / den };
    },
    surf: function (v, x, y) {                     /* g = al x^3 + be y^3 - 3 al p^2 x - 3 be q^2 y + K */
      return {
        g: v.al * x * x * x + v.be * y * y * y - 3 * v.al * v.p * v.p * x - 3 * v.be * v.q * v.q * y + v.K,
        gx: 3 * v.al * (x * x - v.p * v.p), gy: 3 * v.be * (y * y - v.q * v.q), r: 6 * v.al * x, t: 6 * v.be * y
      };
    },
    gscale: function (v) { return Math.sqrt(Math.pow(3 * v.al * v.p * v.p, 2) + Math.pow(3 * v.be * v.q * v.q, 2)); },
    fmt: function (x) {
      if (!isFinite(x)) return "∞";
      if (Math.abs(x) >= 1e7) return x.toExponential(3);
      var r = Math.round(x * 1000) / 1000; if (r === 0) r = 0; return String(r);
    },
    words: function (s) { return (String(s || "").match(/\S+/g) || []).length; }
  };

  /* ---------------- tiny DOM helpers ---------------- */
  function el(tag, attrs, kids) {
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
  function ink() { return getComputedStyle(document.body).color; }
  function lineCol() { return getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#ccc"; }

  var lastPersist = 0;
  function touch(L, val, ctx) {
    L.moves = (L.moves || 0) + 1;
    if (L.lo == null || val < L.lo) L.lo = val;
    if (L.hi == null || val > L.hi) L.hi = val;
    var n = Date.now(); if (n - lastPersist > 400) { lastPersist = n; ctx.persist(); }
  }

  function slider(label, min, max, step, val, unit, onInput) {
    var out = el("b", { text: M.fmt(val) + unit });
    var inp = el("input", { type: "range", min: String(min), max: String(max), step: String(step), "aria-label": label });
    inp.value = String(val);
    inp.addEventListener("input", function () { var v = Number(inp.value); out.textContent = M.fmt(v) + unit; onInput(v); });
    var node = el("div", { class: "slide" }, [el("div", { class: "small" }, [label + ": ", out]), inp]);
    return { node: node, input: inp, set: function (v) { inp.value = String(v); out.textContent = M.fmt(Number(inp.value)) + unit; } };
  }
  function toggle(label, on, onChange) {
    var cb = el("input", { type: "checkbox" }); cb.checked = on;
    cb.addEventListener("change", function () { onChange(cb.checked); });
    return el("label", { class: "tog" }, [cb, " " + label]);
  }
  function readout(names) {
    var cells = names.map(function (n) { var v = el("b", { text: "–" }); return { v: v, n: el("div", { class: "ro" }, [el("span", { class: "small", text: n }), v]) }; });
    var node = el("div", { class: "rogrid" }, cells.map(function (c) { return c.n; }));
    return { node: node, set: function (arr) { arr.forEach(function (t, i) { if (cells[i]) cells[i].v.textContent = t; }); } };
  }
  function canvas() { return el("canvas", { width: "560", height: "420", role: "img", "aria-label": "Your live demonstration" }); }

  /* ---------------- Lab 1: your parabola, curvature, evolute ---------------- */
  function labParab(card, v, L, ctx) {
    var a = v.a, x0 = M.frac(v.x0), R = Math.max(1.6 * Math.abs(x0), 4);
    var st = { x: x0, circ: true, evo: false }, cv = canvas(), ro = readout(["x", "y", "ρ", "centre α", "centre β"]);
    function draw() {
      var c = cv.getContext("2d"), W = cv.width, H = cv.height, s = W / (2.1 * R), i, m;
      var X = function (x) { return W / 2 + x * s; }, Y = function (y) { return H * 0.8 - y * s; };
      c.clearRect(0, 0, W, H); c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.strokeStyle = lineCol(); c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
      c.strokeStyle = "#1f6f8b"; c.lineWidth = 2.4; c.beginPath();
      for (i = 0; i <= 300; i++) { var x = -R + 2 * R * i / 300; (i ? c.lineTo : c.moveTo).call(c, X(x), Y(x * x / (4 * a))); }
      c.stroke();
      if (st.evo) {
        c.strokeStyle = "#c58a1b"; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath();
        for (i = 0; i <= 300; i++) { m = M.parab(a, -R + 2 * R * i / 300); (i ? c.lineTo : c.moveTo).call(c, X(m.al), Y(m.be)); }
        c.stroke(); c.setLineDash([]);
      }
      m = M.parab(a, st.x);
      if (st.circ && m.rho * s < 6000) { c.strokeStyle = "#b4442b"; c.lineWidth = 2; c.beginPath(); c.arc(X(m.al), Y(m.be), m.rho * s, 0, 2 * PI); c.stroke(); }
      c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(m.x), Y(m.y)); c.lineTo(X(m.al), Y(m.be)); c.stroke(); c.setLineDash([]);
      var p0 = M.parab(a, x0); c.strokeStyle = ink(); c.lineWidth = 1.5; c.beginPath(); c.arc(X(p0.x), Y(p0.y), 8, 0, 2 * PI); c.stroke();
      c.fillStyle = "#1f6f8b"; c.beginPath(); c.arc(X(m.x), Y(m.y), 5, 0, 2 * PI); c.fill();
      c.fillStyle = "#b4442b"; c.beginPath(); c.arc(X(m.al), Y(m.be), 4, 0, 2 * PI); c.fill();
      c.fillStyle = ink(); c.font = "13px system-ui"; c.fillText("P", X(m.x) + 8, Y(m.y) - 8);
      c.restore();
      ro.set([M.fmt(m.x), M.fmt(m.y), M.fmt(m.rho), M.fmt(m.al), M.fmt(m.be)]);
    }
    var sl = slider("Move P along your parabola: x", -R, R, R / 400, x0, "", function (val) { st.x = val; touch(L, val, ctx); draw(); });
    card.appendChild(cv);
    card.appendChild(sl.node);
    card.appendChild(el("div", { class: "row" }, [
      toggle("circle of curvature", true, function (on) { st.circ = on; draw(); }),
      toggle("trace the evolute (locus of the centres)", false, function (on) { st.evo = on; draw(); }),
      el("button", { class: "ghost", text: "Back to my task point", onclick: function () { st.x = x0; sl.set(x0); draw(); } })]));
    card.appendChild(el("div", { class: "small", text: "The ring marks your own task point. The dashed line joins P to its centre of curvature." }));
    card.appendChild(ro.node);
    draw();
    return { record: function () { var m = M.parab(a, st.x); return "x=" + M.fmt(m.x) + ", ρ=" + M.fmt(m.rho) + ", centre=(" + M.fmt(m.al) + ", " + M.fmt(m.be) + ")"; } };
  }

  /* ---------------- Lab 2: your ellipse and its evolute ---------------- */
  function labEllipse(card, v, L, ctx) {
    var A = v.A, B = v.B, th0 = Math.atan2(M.frac(v.s), M.frac(v.c)); if (th0 < 0) th0 += 2 * PI;
    var d = Math.abs(A * A - B * B);
    /* a very flat ellipse has an evolute many times its size, so start zoomed in on the ellipse */
    var big = Math.max(Math.max(A, d / A) / A, Math.max(B, d / B) / B) > 2.5;
    var st = { deg: th0 * 180 / PI, circ: true, evo: true, zoom: big }, cv = canvas(), ro = readout(["θ (degrees)", "x", "y", "ρ", "centre α", "centre β"]);
    function draw() {
      var c = cv.getContext("2d"), W = cv.width, H = cv.height, i, m;
      var ex = 1.15 * (st.zoom ? A : Math.max(A, d / A)), ey = 1.15 * (st.zoom ? B : Math.max(B, d / B));
      var s = Math.min(W / 2 / ex, H / 2 / ey);
      var X = function (x) { return W / 2 + x * s; }, Y = function (y) { return H / 2 - y * s; };
      c.clearRect(0, 0, W, H); c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.strokeStyle = lineCol(); c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
      c.strokeStyle = "#7a4fa3"; c.lineWidth = 2.4; c.beginPath();
      for (i = 0; i <= 360; i++) { m = M.ellipse(A, B, i * PI / 180); (i ? c.lineTo : c.moveTo).call(c, X(m.x), Y(m.y)); }
      c.stroke();
      if (st.evo) {
        c.strokeStyle = "#c58a1b"; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath();
        for (i = 0; i <= 360; i++) { m = M.ellipse(A, B, i * PI / 180); (i ? c.lineTo : c.moveTo).call(c, X(m.al), Y(m.be)); }
        c.stroke(); c.setLineDash([]);
      }
      m = M.ellipse(A, B, st.deg * PI / 180);
      if (st.circ && m.rho * s < 6000) { c.strokeStyle = "#b4442b"; c.lineWidth = 2; c.beginPath(); c.arc(X(m.al), Y(m.be), m.rho * s, 0, 2 * PI); c.stroke(); }
      c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(m.x), Y(m.y)); c.lineTo(X(m.al), Y(m.be)); c.stroke(); c.setLineDash([]);
      var p0 = M.ellipse(A, B, th0); c.strokeStyle = ink(); c.lineWidth = 1.5; c.beginPath(); c.arc(X(p0.x), Y(p0.y), 8, 0, 2 * PI); c.stroke();
      c.fillStyle = "#7a4fa3"; c.beginPath(); c.arc(X(m.x), Y(m.y), 5, 0, 2 * PI); c.fill();
      c.fillStyle = "#b4442b"; c.beginPath(); c.arc(X(m.al), Y(m.be), 4, 0, 2 * PI); c.fill();
      c.fillStyle = ink(); c.font = "13px system-ui"; c.fillText("P", X(m.x) + 8, Y(m.y) - 8);
      c.restore();
      ro.set([M.fmt(st.deg), M.fmt(m.x), M.fmt(m.y), M.fmt(m.rho), M.fmt(m.al), M.fmt(m.be)]);
    }
    var sl = slider("Move P around your ellipse: θ", 0, 360, 0.5, Math.round(st.deg * 2) / 2, "°", function (val) { st.deg = val; touch(L, val, ctx); draw(); });
    card.appendChild(cv);
    card.appendChild(sl.node);
    card.appendChild(el("div", { class: "row" }, [
      toggle("circle of curvature", true, function (on) { st.circ = on; draw(); }),
      toggle("evolute", true, function (on) { st.evo = on; draw(); }),
      toggle("zoom in on the ellipse", st.zoom, function (on) { st.zoom = on; draw(); }),
      el("button", { class: "ghost", text: "Back to my task point", onclick: function () { st.deg = th0 * 180 / PI; sl.set(Math.round(st.deg * 2) / 2); draw(); } })]));
    card.appendChild(el("div", { class: "small", text: "The ring marks your own task point. The evolute can be much larger than the ellipse, so use the zoom switch to see both clearly." }));
    card.appendChild(ro.node);
    draw();
    return { record: function () { var m = M.ellipse(A, B, st.deg * PI / 180); return "θ=" + M.fmt(st.deg) + "°, ρ=" + M.fmt(m.rho) + ", centre=(" + M.fmt(m.al) + ", " + M.fmt(m.be) + ")"; } };
  }

  /* ---------------- Lab 3: your surface, slopes, walking uphill ---------------- */
  function labSurface(card, v, L, ctx) {
    var R = Math.max(v.p, v.q) * 1.8, W = 560, H = 420, gs = M.gscale(v), th = 0.02 * gs;
    var st = { x: 0, y: 0, trail: [] }, cv = canvas(), off = null;
    var ro = readout(["x", "y", "g(x, y)", "∂g/∂x", "∂g/∂y", "|slope|"]);
    var verdict = el("div", { class: "hint", style: "--c:" + ctx.color });
    function heat() {
      off = document.createElement("canvas"); off.width = W; off.height = H;
      var oc = off.getContext("2d"), img = oc.createImageData(W, H), vals = new Float32Array(W * H), i, j;
      for (j = 0; j < H; j++) for (i = 0; i < W; i++) vals[j * W + i] = M.surf(v, -R + 2 * R * i / (W - 1), R - 2 * R * j / (H - 1)).g;
      var sorted = Array.prototype.slice.call(vals).sort(function (a, b) { return a - b; });
      var lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)];
      for (i = 0; i < vals.length; i++) {
        var t = Math.max(0, Math.min(1, (vals[i] - lo) / (hi - lo))), k = i * 4;
        img.data[k] = 30 + 200 * t; img.data[k + 1] = 40 + 170 * t * t + 30 * t; img.data[k + 2] = 110 + 200 * (1 - t) * t + 40 * t; img.data[k + 3] = 255;
      }
      oc.putImageData(img, 0, 0);
    }
    var X = function (x) { return (x + R) / (2 * R) * (W - 1); }, Y = function (y) { return (R - y) / (2 * R) * (H - 1); };
    function info() {
      var m = M.surf(v, st.x, st.y), mag = Math.sqrt(m.gx * m.gx + m.gy * m.gy);
      ro.set([M.fmt(st.x), M.fmt(st.y), M.fmt(m.g), M.fmt(m.gx), M.fmt(m.gy), M.fmt(mag)]);
      if (mag < th) {
        var D = m.r * m.t, kind = D < 0 ? "a saddle point" : (D === 0 ? "inconclusive (rt − s² = 0)" : (m.r > 0 ? "a local minimum" : "a local maximum"));
        verdict.textContent = "Both slopes are almost zero, so this is a critical point. Here r = " + M.fmt(m.r) + ", t = " + M.fmt(m.t) + ", s = 0, so rt − s² = " + M.fmt(D) + ": " + kind + ".";
      } else verdict.textContent = "The slope is not zero here, so this is not a critical point. Walk uphill or downhill and watch |slope|.";
      return { m: m, mag: mag, crit: mag < th };
    }
    function draw() {
      var c = cv.getContext("2d"); if (!off) heat();
      c.clearRect(0, 0, W, H); c.drawImage(off, 0, 0);
      if (st.trail.length > 1) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); st.trail.forEach(function (p, i) { (i ? c.lineTo : c.moveTo).call(c, X(p[0]), Y(p[1])); }); c.stroke(); }
      c.strokeStyle = "#fff"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.globalAlpha = 0.35; c.stroke(); c.globalAlpha = 1;
      c.fillStyle = "#fff"; c.strokeStyle = "#111"; c.lineWidth = 2.5; c.beginPath(); c.arc(X(st.x), Y(st.y), 7, 0, 2 * PI); c.fill(); c.stroke();
      info();
    }
    function setXY(x, y, keepTrail) {
      st.x = Math.max(-R, Math.min(R, x)); st.y = Math.max(-R, Math.min(R, y));
      if (!keepTrail) st.trail = [[st.x, st.y]]; else st.trail.push([st.x, st.y]);
      sx.set(st.x); sy.set(st.y); touch(L, st.x, ctx); draw();
    }
    function walk(dir) {
      /* each direction is scaled by its own curvature, so the dot settles in about a dozen steps for every surface */
      var m = M.surf(v, st.x, st.y), cap = 0.12 * R;
      var dx = dir * m.gx * 0.5 / (6 * v.al * v.p), dy = dir * m.gy * 0.5 / (6 * v.be * v.q);
      dx = Math.max(-cap, Math.min(cap, dx)); dy = Math.max(-cap, Math.min(cap, dy));
      if (!st.trail.length) st.trail = [[st.x, st.y]];
      setXY(st.x + dx, st.y + dy, true);
    }
    var sx = slider("x", -R, R, 0.01, 0, "", function (val) { st.x = val; st.trail = [[st.x, st.y]]; touch(L, val, ctx); draw(); });
    var sy = slider("y", -R, R, 0.01, 0, "", function (val) { st.y = val; st.trail = [[st.x, st.y]]; touch(L, st.x, ctx); draw(); });
    cv.addEventListener("pointerdown", function (e) {
      var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width, py = (e.clientY - r.top) * H / r.height;
      setXY(-R + 2 * R * px / (W - 1), R - 2 * R * py / (H - 1), false);
    });
    card.appendChild(cv);
    card.appendChild(el("div", { class: "small", text: "Light = high, dark = low. Tap the picture to place the white dot anywhere, or use the sliders." }));
    card.appendChild(sx.node); card.appendChild(sy.node);
    card.appendChild(el("div", { class: "row" }, [
      el("button", { text: "Step uphill ▲", onclick: function () { walk(1); } }),
      el("button", { text: "Step downhill ▼", onclick: function () { walk(-1); } }),
      el("button", { class: "ghost", text: "Clear trail", onclick: function () { st.trail = [[st.x, st.y]]; draw(); } })]));
    card.appendChild(ro.node);
    card.appendChild(verdict);
    st.trail = [[0, 0]]; draw();
    return { record: function () {
      var i = info(), t = "(x, y)=(" + M.fmt(st.x) + ", " + M.fmt(st.y) + "), g=" + M.fmt(i.m.g) + ", g_x=" + M.fmt(i.m.gx) + ", g_y=" + M.fmt(i.m.gy);
      if (i.crit) t += " [critical point: " + (i.m.r * i.m.t < 0 ? "saddle" : (i.m.r > 0 ? "local min" : "local max")) + "]";
      return t;
    } };
  }

  /* ---------------- what each period's lab needs and asks ---------------- */
  var DEFS = {
    1: { title: "Curvature on your own parabola", needs: ["1.1", "1.2"], task: "1.2", build: labParab, qs: [
      "Move P along the parabola. Where is the circle of curvature smallest, and what is ρ there?",
      "As P moves far from the vertex, what happens to ρ and to the centre of curvature?",
      "Switch on the evolute trace. Describe the path the centre follows.",
      "Compare the readings at x and at −x. What symmetry do you notice?"] },
    2: { title: "Evolute of your own ellipse", needs: ["1.4", "2.1"], task: "2.1", build: labEllipse, qs: [
      "Move P all the way round. At which points is ρ largest, and at which is it smallest?",
      "Describe the shape of the evolute. How many cusps does it have, and where are they?",
      "When the centre of curvature sits at a cusp of the evolute, where is P on the ellipse?",
      "Is the circle of curvature inside or outside the ellipse near the ends of the axes?"] },
    3: { title: "Explore your own surface", needs: ["3.5"], task: "3.5", build: labSurface, qs: [
      "Press Step uphill from different starting points. Where does the dot stall, and what is |slope| there?",
      "Find all four points where both slopes are zero. Which are minima, maxima or saddles?",
      "What does rt − s² tell you at each of them?",
      "What do the colours look like around a saddle point compared with a peak or a pit?"] }
  };

  /* ---------------- notebook ---------------- */
  var FIELDS = [
    ["obs", "What did you observe?", "Describe what changed as you moved things. Quote at least two of your recorded readings."],
    ["str", "Where did you struggle?", "Name the step or idea that was hard, and what finally helped. Be honest; this helps me teach."],
    ["learn", "Important points I learnt", "In your own words, as if explaining to a friend. Please do not copy."]
  ];
  function area(obj, key, label, hint, ctx) {
    var ta = el("textarea", { placeholder: hint, "aria-label": label }); ta.value = obj[key] || "";
    var cnt = el("span", { class: "small" });
    function upd() { var n = M.words(ta.value); cnt.textContent = n + (n === 1 ? " word" : " words") + (n < 25 ? " (aim for 25 or more)" : ""); }
    ta.addEventListener("input", function () { obj[key] = ta.value; upd(); ctx.persist(); });
    upd();
    return el("div", { style: "margin-top:10px" }, [el("div", {}, [el("b", { text: label })]), ta, cnt]);
  }
  function notebook(period, L, ctx) {
    var card = el("div", { class: "card lab", style: "--c:" + ctx.color });
    card.appendChild(el("div", { class: "topic", text: "Lab notebook · Period " + period }));
    card.appendChild(el("div", { class: "small", text: "This is marked on your own thinking. There are no right answers here, only honest observations." }));
    FIELDS.forEach(function (f) { card.appendChild(area(L, f[0], f[1], f[2], ctx)); });
    return card;
  }
  function finalCard(save, ctx) {
    var F = save.lab.final = save.lab.final || { remember: "", use: "", c1: "", c2: "", c3: "" };
    var card = el("div", { class: "card lab", style: "--c:" + ctx.color });
    card.appendChild(el("div", { class: "topic", text: "Final reflection · all three periods" }));
    card.appendChild(area(F, "remember", "The one idea from today that I will remember", "Say it in one or two sentences.", ctx));
    card.appendChild(area(F, "use", "Where could I use this outside the classroom?", "For example: road or track design, lenses, gears, optimisation.", ctx));
    [["c1", "Curvature and circle of curvature"], ["c2", "Evolutes, envelopes and pedal equations"], ["c3", "Partial derivatives and extrema"]].forEach(function (r) {
      var sel = el("select", { "aria-label": r[1] }, ["", "1", "2", "3", "4", "5"].map(function (o) { return el("option", { value: o, text: o || "choose" }); }));
      sel.value = F[r[0]] || "";
      sel.addEventListener("change", function () { F[r[0]] = sel.value; ctx.persist(); });
      card.appendChild(el("div", { class: "row", style: "margin-top:8px" }, [el("span", { text: "My confidence (1 low, 5 high): " + r[1] + "  " }), sel]));
    });
    return card;
  }

  /* ---------------- public: render one period ---------------- */
  function render(period, box, ctx) {
    var save = ctx.save; save.lab = save.lab || {};
    var L = save.lab["p" + period] = save.lab["p" + period] || { moves: 0, lo: null, hi: null, readings: [], obs: "", str: "", learn: "" };
    L.readings = L.readings || [];
    var def = DEFS[period], task = ctx.tasks.filter(function (t) { return t.id === def.task; })[0];
    var card = el("div", { class: "card lab", style: "--c:" + ctx.color });
    card.appendChild(el("div", { class: "topic", text: "Live lab · " + def.title }));
    var missing = def.needs.filter(function (id) { return !ctx.done(id); });
    if (missing.length || !task || !task.viz) {
      card.appendChild(el("div", { class: "small", text: "Confirm task " + missing.join(" and ") + " to open your lab. It runs on your own " + (period === 3 ? "surface" : "curve") + " and its readings would give those answers away." }));
    } else {
      card.appendChild(el("div", { class: "small", text: "Everything here is built from your own numbers. Explore freely, then record at least three readings that show something you noticed." }));
      var api = def.build(card, task.viz, L, ctx);
      card.appendChild(el("div", { class: "row", style: "margin-top:10px" }, [el("button", { text: "Record this reading", onclick: function () {
        if (L.readings.length >= 8) { L.readings.shift(); }
        L.readings.push(api.record()); ctx.persist(); drawReadings();
      } })]));
      var list = el("div", { class: "small", style: "margin-top:8px" });
      card.appendChild(list);
      var drawReadings = function () {
        list.innerHTML = "";
        if (!L.readings.length) { list.appendChild(el("div", { text: "No readings recorded yet." })); return; }
        L.readings.forEach(function (r, i) {
          list.appendChild(el("div", { class: "reading" }, [el("span", { text: (i + 1) + ".  " + r }), " ", el("button", { class: "ghost", style: "padding:0 8px", text: "×", "aria-label": "Remove reading " + (i + 1), onclick: function () { L.readings.splice(i, 1); ctx.persist(); drawReadings(); } })]));
        });
      };
      drawReadings();
      var ul = el("ul", { class: "small", style: "margin:12px 0 0" }); def.qs.forEach(function (q) { ul.appendChild(el("li", { text: q })); });
      card.appendChild(el("div", { class: "topic", style: "margin-top:14px", text: "Look for these" })); card.appendChild(ul);
    }
    box.appendChild(card);
    box.appendChild(notebook(period, L, ctx));
    if (period === 3) box.appendChild(finalCard(save, ctx));
  }

  /* ---------------- text that goes into the submission file ---------------- */
  function quote(t) { return String(t || "(none)").replace(/\r/g, "").split("\n").map(function (l) { return "> " + l; }).join("\n"); }
  function submissionLines(save) {
    var lab = save.lab || {}, out = ["LAB NOTEBOOK"];
    [1, 2, 3].forEach(function (p) {
      var L = lab["p" + p] || {}, rd = L.readings || [];
      out.push("LAB " + p + " | moves=" + (L.moves || 0) + " | explored=" + (L.lo == null ? "none" : M.fmt(L.lo) + " to " + M.fmt(L.hi)) + " | readings=" + rd.length);
      rd.forEach(function (r, i) { out.push("READING " + p + "." + (i + 1) + ": " + r); });
      out.push("OBSERVED:"); out.push(quote(L.obs));
      out.push("STRUGGLED:"); out.push(quote(L.str));
      out.push("LEARNT:"); out.push(quote(L.learn));
    });
    var F = lab.final || {};
    out.push("FINAL REFLECTION");
    out.push("REMEMBER:"); out.push(quote(F.remember));
    out.push("USE:"); out.push(quote(F.use));
    out.push("CONFIDENCE curvature=" + (F.c1 || "-") + " evolutes=" + (F.c2 || "-") + " extrema=" + (F.c3 || "-"));
    return out;
  }

  var api = { render: render, submissionLines: submissionLines, M: M };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PassportLab = api;
})(typeof window !== "undefined" ? window : globalThis);
