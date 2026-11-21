/* viz.js - a playable picture for every task.
   Each task card gets a "Visualise this question" panel built from the student's own numbers (task.viz).
   The picture is always free to explore. Numbers are shown only after the task is confirmed, so the
   panel never gives an answer away. Student data is never written as HTML (textContent only). */
(function (root) {
  "use strict";
  var running = [];

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
  function fr(s) { var p = String(s).split("/"); return p.length > 1 ? Number(p[0]) / Number(p[1]) : Number(p[0]); }
  function ink() { return getComputedStyle(document.body).color; }
  function lineCol() { return getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#ccc"; }
  function nf(x) {
    if (!isFinite(x)) return "-";
    var a = Math.abs(x), s = a >= 1000 ? x.toFixed(1) : a >= 10 ? x.toFixed(2) : x.toFixed(3);
    return s.replace(/\.?0+$/, "");
  }
  var BLUE = "#1f6f8b", RED = "#b4442b", PURPLE = "#8a5cc2", GREEN = "#2f9a5f", GREY = "#9aa3b5";

  /* ---------- drawing helpers ---------- */
  function view(cv, rect, x0, x1, y0, y1, equal) {
    var c = cv.getContext("2d"), pad = 14, sx = (rect.w - 2 * pad) / (x1 - x0), sy = (rect.h - 2 * pad) / (y1 - y0);
    var s = Math.min(sx, sy), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, X, Y;
    if (equal) {
      X = function (x) { return rect.x + rect.w / 2 + (x - cx) * s; };
      Y = function (y) { return rect.y + rect.h / 2 - (y - cy) * s; };
    } else {
      X = function (x) { return rect.x + pad + (x - x0) * sx; };
      Y = function (y) { return rect.y + rect.h - pad - (y - y0) * sy; };
    }
    c.save(); c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip();
    c.strokeStyle = lineCol(); c.lineWidth = 1; c.beginPath();
    c.moveTo(rect.x, Y(0)); c.lineTo(rect.x + rect.w, Y(0)); c.moveTo(X(0), rect.y); c.lineTo(X(0), rect.y + rect.h); c.stroke();
    return { c: c, X: X, Y: Y, s: equal ? s : sx, end: function () { c.restore(); } };
  }
  function path(f, pts, col, w, dash) {
    var c = f.c; c.strokeStyle = col; c.lineWidth = w || 2; c.setLineDash(dash || []); c.beginPath();
    pts.forEach(function (p, i) { if (i) c.lineTo(f.X(p[0]), f.Y(p[1])); else c.moveTo(f.X(p[0]), f.Y(p[1])); });
    c.stroke(); c.setLineDash([]);
  }
  function seg(f, a, b, col, w, dash) { path(f, [a, b], col, w, dash); }
  function dot(f, x, y, col, label, r) {
    f.c.fillStyle = col; f.c.beginPath(); f.c.arc(f.X(x), f.Y(y), r || 5, 0, 7); f.c.fill();
    if (label) { f.c.fillStyle = ink(); f.c.font = "13px system-ui, sans-serif"; f.c.fillText(label, f.X(x) + 8, f.Y(y) - 8); }
  }
  function circle(f, x, y, rad, col, w) {
    f.c.strokeStyle = col; f.c.lineWidth = w || 2; f.c.beginPath(); f.c.arc(f.X(x), f.Y(y), rad * f.s, 0, 7); f.c.stroke();
  }
  function sample(fn, a, b, n) { var out = [], i; for (i = 0; i <= n; i++) out.push(fn(a + (b - a) * i / n)); return out; }
  function bbox(pts) {
    var b = [1e18, -1e18, 1e18, -1e18];
    pts.forEach(function (p) { if (isFinite(p[0]) && isFinite(p[1])) { b[0] = Math.min(b[0], p[0]); b[1] = Math.max(b[1], p[0]); b[2] = Math.min(b[2], p[1]); b[3] = Math.max(b[3], p[1]); } });
    return b;
  }
  function pad(b, k) { var w = (b[1] - b[0]) || 1, h = (b[3] - b[2]) || 1; return [b[0] - k * w, b[1] + k * w, b[2] - k * h, b[3] + k * h]; }
  function clearCv(cv) { cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
  function label(f, text, x, y) { f.c.fillStyle = ink(); f.c.font = "13px system-ui, sans-serif"; f.c.fillText(text, x, y); }

  /* ---------- widget shell: canvas + sliders + play + readouts ---------- */
  function widget(box, ctx, o) {
    var W = o.W || 560, H = o.H || 340;
    var wrap = el("div", { class: "vz" });
    if (o.title) wrap.appendChild(el("div", { class: "vzt", text: o.title }));
    if (o.note) wrap.appendChild(el("div", { class: "small", text: o.note }));
    var cv = el("canvas", { width: String(W), height: String(H), role: "img", "aria-label": o.title || "Visualiser" });
    wrap.appendChild(cv);
    var vals = o.sliders.map(function (s) { return s.val; }), inputs = [], labels = [];
    o.sliders.forEach(function (s, i) {
      var lab = el("span", { class: "small vzl" });
      var inp = el("input", { type: "range", min: String(s.min), max: String(s.max), step: String(s.step), "aria-label": s.label });
      inp.value = String(s.val);
      inp.addEventListener("input", function () { vals[i] = Number(inp.value); draw(); });
      inputs.push(inp); labels.push(lab);
      wrap.appendChild(el("div", { class: "vzs" }, [lab, inp]));
    });
    var reads = el("div", { class: "vzr" });
    var playBtn = el("button", { class: "ghost", text: "▶ Play" });
    var home = el("button", { class: "ghost", text: "Back to my point" });
    var row = el("div", { class: "row", style: "margin:6px 0" }, [playBtn, home]);
    wrap.appendChild(row); wrap.appendChild(reads);
    var raf = null, dir = 1, last = 0;
    function draw() {
      clearCv(cv);
      o.sliders.forEach(function (s, i) { labels[i].textContent = s.label + " = " + (s.fmt ? s.fmt(vals[i]) : nf(vals[i])); });
      o.draw(cv, vals);
      reads.innerHTML = "";
      if (!ctx.unlocked) { reads.appendChild(el("div", { class: "small", text: "🔒 The picture is free to explore. The numbers for this question unlock when you confirm your answer." })); return; }
      var grid = el("div", { class: "rogrid" });
      (o.reads ? o.reads(vals) : []).forEach(function (r) { grid.appendChild(el("div", { class: "ro" }, [el("span", { class: "small", text: r[0] }), el("b", { text: r[1] })])); });
      reads.appendChild(grid);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; playBtn.textContent = "▶ Play"; }
    function tick(ts) {
      var s = o.sliders[0], span = s.max - s.min, dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts; vals[0] += dir * span * dt / 7;
      if (vals[0] >= s.max) { vals[0] = s.max; dir = -1; } else if (vals[0] <= s.min) { vals[0] = s.min; dir = 1; }
      inputs[0].value = String(vals[0]); draw(); raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener("click", function () {
      if (raf) { stop(); return; }
      playBtn.textContent = "⏸ Pause"; last = performance.now(); raf = requestAnimationFrame(tick);
    });
    home.addEventListener("click", function () { stop(); o.sliders.forEach(function (s, i) { vals[i] = s.val; inputs[i].value = String(s.val); }); draw(); });
    running.push(stop);
    box.appendChild(wrap);
    draw();
  }

  /* ---------- parametric curves with circle of curvature ---------- */
  function curveWidget(box, ctx, c) {
    var N = 360, pts = sample(function (t) { var r = c.fn(t); return [r.x, r.y]; }, c.tmin, c.tmax, N);
    var r0 = c.fn(c.t0), b = bbox(pts), k0 = r0.dx * r0.ddy - r0.dy * r0.ddx;
    var sp = Math.pow(r0.dx * r0.dx + r0.dy * r0.dy, 1.5), rho0 = k0 ? sp / Math.abs(k0) : 0;
    var diag = Math.max(b[1] - b[0], b[3] - b[2]);
    if (rho0 && c.showCircle !== false && rho0 <= 1.5 * diag) {
      var q = Math.pow(r0.dx * r0.dx + r0.dy * r0.dy, 1) / k0, cx0 = r0.x - r0.dy * q, cy0 = r0.y + r0.dx * q, R0 = rho0;
      b = bbox(pts.concat([[cx0 - R0, cy0 - R0], [cx0 + R0, cy0 + R0]]));
    }
    var ev = c.evolute ? sample(function (t) { var g = geom(c.fn(t)); return [g.cx, g.cy]; }, c.tmin, c.tmax, N) : null;
    if (ev && c.evoInBox) b = bbox(pts.concat(ev));
    var B = pad(b, 0.08);
    function geom(r) {
      var d2 = r.dx * r.dx + r.dy * r.dy, k = r.dx * r.ddy - r.dy * r.ddx;
      if (Math.abs(k) < 1e-12) return { rho: Infinity, cx: NaN, cy: NaN, kappa: 0 };
      return { rho: Math.pow(d2, 1.5) / Math.abs(k), cx: r.x - r.dy * d2 / k, cy: r.y + r.dx * d2 / k };
    }
    widget(box, ctx, {
      title: c.title, note: c.note, W: 560, H: 340,
      sliders: [{ label: c.tlabel || "t", min: c.tmin, max: c.tmax, step: (c.tmax - c.tmin) / 400, val: c.t0, fmt: c.tfmt }],
      draw: function (cv, v) {
        var f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, B[0], B[1], B[2], B[3], true);
        if (ev) path(f, ev, PURPLE, 1.6, [5, 4]);
        path(f, pts, BLUE, 2.4);
        var r = c.fn(v[0]), g = geom(r);
        if (c.arc) {
          var up = sample(function (t) { var gg = geom(c.fn(t)); return [gg.cx, gg.cy]; }, c.arc[0], v[0], 80);
          path(f, up, RED, 3.4);
        }
        if (isFinite(g.rho) && g.rho < 1e5 && c.showCircle !== false) {
          circle(f, g.cx, g.cy, g.rho, RED, 2);
          seg(f, [r.x, r.y], [g.cx, g.cy], GREY, 1.5, [5, 4]);
          dot(f, g.cx, g.cy, RED, "centre");
        }
        var L = Math.hypot(r.dx, r.dy) || 1, tl = diag * 0.18;
        seg(f, [r.x - r.dx / L * tl, r.y - r.dy / L * tl], [r.x + r.dx / L * tl, r.y + r.dy / L * tl], GREEN, 1.8);
        dot(f, r.x, r.y, BLUE, "P");
        f.end();
      },
      reads: function (v) { var r = c.fn(v[0]); return c.reads(r, geom(r), v[0]); }
    });
  }

  function parab(task, box, ctx) {
    var a = task.viz.a, x0 = fr(task.viz.x0), R = Math.abs(x0) * 1.8 + a;
    var id = task.id;
    curveWidget(box, ctx, {
      title: "Slide P along your parabola x² = " + (4 * a) + "y",
      note: id === "1.1" ? "The red circle is the circle that hugs the curve at P. Watch it grow where the curve flattens and shrink where it bends sharply."
        : id === "1.2" ? "The dashed segment joins P to the centre of curvature. The dotted purple curve is the evolute: the path of the centre as P moves."
        : "The red circle is your circle of curvature. Its equation x² + y² − 2αx − 2βy + c = 0 hides the constant c.",
      fn: function (u) { return { x: u, y: u * u / (4 * a), dx: 1, dy: u / (2 * a), ddx: 0, ddy: 1 / (2 * a) }; },
      tmin: -R, tmax: R, t0: x0, tlabel: "x of P", evolute: id !== "1.1",
      reads: function (r, g) {
        if (id === "1.1") return [["ρ", nf(g.rho)], ["x of P", nf(r.x)], ["y of P", nf(r.y)]];
        if (id === "1.2") return [["α", nf(g.cx)], ["β", nf(g.cy)], ["ρ", nf(g.rho)]];
        return [["ρ", nf(g.rho)], ["α", nf(g.cx)], ["β", nf(g.cy)], ["c = α² + β² − ρ²", nf(g.cx * g.cx + g.cy * g.cy - g.rho * g.rho)]];
      }
    });
  }

  function ellipse(task, box, ctx) {
    var A = task.viz.A, B = task.viz.B, th0 = Math.atan2(fr(task.viz.s), fr(task.viz.c)), id = task.id;
    var fn = function (t) { return { x: A * Math.cos(t), y: B * Math.sin(t), dx: -A * Math.sin(t), dy: B * Math.cos(t), ddx: -A * Math.cos(t), ddy: -B * Math.sin(t) }; };
    var deg = function (t) { return nf(t * 180 / Math.PI) + "°"; };
    var rhoAt = function (t) { return Math.pow(A * A * Math.sin(t) * Math.sin(t) + B * B * Math.cos(t) * Math.cos(t), 1.5) / (A * B); };
    var cfg = {
      title: "Move P round your ellipse x = " + A + " cos θ, y = " + B + " sin θ", fn: fn, tlabel: "θ", tfmt: deg,
      tmin: 0, tmax: 2 * Math.PI, t0: th0 < 0 ? th0 + 2 * Math.PI : th0
    };
    if (id === "1.4") {
      cfg.note = "The red circle hugs the ellipse at P. It is smallest at the ends of the long axis and largest at the ends of the short axis.";
      cfg.reads = function (r, g) { return [["ρ", nf(g.rho)]]; };
    } else if (id === "2.1") {
      cfg.note = "The dotted purple curve is the evolute: every centre of curvature of the ellipse. The red dot is the centre belonging to P.";
      cfg.evolute = true; cfg.evoInBox = true; cfg.showCircle = false;
      cfg.reads = function (r, g) { return [["α", nf(g.cx)], ["β", nf(g.cy)]]; };
      cfg.showCircle = true;
    } else {
      cfg.title = "Unwind the evolute: θ from 0 to π/2";
      cfg.note = "The thick red path is the part of the evolute traced as θ grows. The ellipse is drawn by a taut string unwinding from that path, so the string length is ρ.";
      cfg.evolute = true; cfg.evoInBox = true; cfg.arc = [0, Math.PI / 2];
      cfg.tmin = 0; cfg.tmax = Math.PI / 2; cfg.t0 = Math.PI / 4;
      cfg.reads = function (r, g, t) { return [["ρ now", nf(g.rho)], ["ρ at θ = 0", nf(rhoAt(0))], ["ρ at θ = π/2", nf(rhoAt(Math.PI / 2))], ["arc traced so far", nf(Math.abs(rhoAt(t) - rhoAt(0)))], ["arc for θ = 0 to π/2", nf(Math.abs(rhoAt(Math.PI / 2) - rhoAt(0)))]]; };
    }
    curveWidget(box, ctx, cfg);
  }

  function spiral(task, box, ctx) {
    var b = fr(task.viz.b), k = task.viz.k, r0 = task.viz.r0, th0 = Math.log(r0 / k) / b;
    var fn = function (t) {
      var r = k * Math.exp(b * t), C = Math.cos(t), S = Math.sin(t);
      return { x: r * C, y: r * S, dx: r * (b * C - S), dy: r * (b * S + C), ddx: r * ((b * b - 1) * C - 2 * b * S), ddy: r * ((b * b - 1) * S + 2 * b * C) };
    };
    curveWidget(box, ctx, {
      title: "Ride along your spiral r = " + k + "·e^(" + task.viz.b + "θ)",
      note: "The angle between the radius and the tangent never changes on this spiral. Watch how the circle of curvature scales with r.",
      fn: fn, tmin: th0 - Math.max(2.2 / b, 1.5), tmax: th0 + Math.max(0.7 / b, 0.5), t0: th0, tlabel: "θ", tfmt: function (t) { return nf(t) + " rad"; },
      reads: function (r, g, t) { var rr = k * Math.exp(b * t); return [["r", nf(rr)], ["ρ", nf(g.rho)], ["ρ ÷ r", nf(g.rho / rr)]]; }
    });
  }

  function cycloid(task, box, ctx) {
    var a = task.viz.a, t0 = Math.acos(fr(task.viz.cost));
    curveWidget(box, ctx, {
      title: "Roll your cycloid x = " + a + "(t − sin t), y = " + a + "(1 − cos t)",
      note: "The dotted purple curve is the evolute. It is another cycloid of the same size, shifted. Slide t and watch the red centre run along it.",
      fn: function (t) { return { x: a * (t - Math.sin(t)), y: a * (1 - Math.cos(t)), dx: a * (1 - Math.cos(t)), dy: a * Math.sin(t), ddx: a * Math.sin(t), ddy: a * Math.cos(t) }; },
      tmin: 0.04, tmax: 2 * Math.PI - 0.04, t0: t0 < 0.04 ? 0.04 : t0, tlabel: "t", tfmt: function (t) { return nf(t) + " rad"; },
      evolute: true, evoInBox: true,
      reads: function (r, g, t) { return [["ρ²", nf(g.rho * g.rho)], ["β (centre height)", nf(g.cy)], ["cos t", nf(Math.cos(t))]]; }
    });
  }

  /* ---------- envelopes ---------- */
  function env1(task, box, ctx) {
    var s = task.viz.s, r = task.viz.r, sq = Math.round(Math.sqrt(s));
    var env = sample(function (p) { return [p * p / s, (s - p) * (s - p) / s]; }, 0, s, 160);
    widget(box, ctx, {
      title: "Lines x/p + y/q = 1 with p + q = " + s, W: 480, H: 420,
      note: "Slide p: the line pivots and its touching point traces the envelope. The dashed vertical marks the x-coordinate in your question.",
      sliders: [{ label: "p", min: 0.05 * s, max: 0.95 * s, step: s / 400, val: r * sq }],
      draw: function (cv, v) {
        var m = 0.1 * s, f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, -m, s + m, -m, s + m, true), i, p = v[0];
        for (i = 1; i < 30; i++) { var pp = s * i / 30; seg(f, [pp, 0], [0, s - pp], lineCol(), 1); }
        path(f, env, PURPLE, 2.4);
        seg(f, [r * r, -m], [r * r, s + m], GREY, 1.4, [5, 4]);
        seg(f, [p, 0], [0, s - p], RED, 2.2);
        dot(f, p, 0, RED, "p"); dot(f, 0, s - p, RED, "q");
        dot(f, p * p / s, (s - p) * (s - p) / s, BLUE, "touch");
        f.end();
      },
      reads: function (v) { var p = v[0]; return [["x of touching point", nf(p * p / s)], ["y of touching point", nf((s - p) * (s - p) / s)]]; }
    });
  }

  function env2(task, box, ctx) {
    var c = task.viz.c, m0 = fr(task.viz.m), sg = m0 < 0 ? -1 : 1, i;
    var xmax = 7 * c, up = sample(function (x) { return [x, 2 * Math.sqrt(c * x)]; }, 0, xmax, 140), dn = up.map(function (p) { return [p[0], -p[1]]; });
    widget(box, ctx, {
      title: "Lines y = mx + " + c + "/m", W: 520, H: 380,
      note: "Each line touches the parabola y² = " + (4 * c) + "x at exactly one point. Slide m and watch the touching point walk along it.",
      sliders: [{ label: "m", min: 0.25, max: 4, step: 0.01, val: Math.abs(m0), fmt: function (v) { return (sg < 0 ? "−" : "") + nf(v); } }],
      draw: function (cv, v) {
        var f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, -0.6 * c, xmax + 0.3 * c, -6.2 * c, 6.2 * c, true), m = sg * v[0], mm;
        for (i = 0; i < 26; i++) { mm = sg * 0.25 * Math.pow(16, i / 25); seg(f, [-0.6 * c, mm * -0.6 * c + c / mm], [xmax, mm * xmax + c / mm], lineCol(), 1); }
        path(f, up, PURPLE, 2.4); path(f, dn, PURPLE, 2.4);
        seg(f, [-0.6 * c, m * -0.6 * c + c / m], [xmax, m * xmax + c / m], RED, 2.2);
        dot(f, c / (m * m), 2 * c / m, BLUE, "touch");
        f.end();
      },
      reads: function (v) { var m = sg * v[0]; return [["x of touching point", nf(c / (m * m))], ["y of touching point", nf(2 * c / m)]]; }
    });
  }

  /* ---------- pedal equations ---------- */
  function pedal(task, box, ctx) {
    var a = task.viz.a, u = fr(task.viz.u), cc = task.viz.c, tp = fr(task.viz.t);
    function pedalDraw(cv, P, T, curve, bnds, tl) {
      var f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, bnds[0], bnds[1], bnds[2], bnds[3], true);
      path(f, curve, BLUE, 2.4);
      var L = Math.hypot(T[0], T[1]), ux = T[0] / L, uy = T[1] / L, ext = tl;
      seg(f, [P[0] - ux * ext, P[1] - uy * ext], [P[0] + ux * ext, P[1] + uy * ext], GREEN, 1.8);
      var d = P[0] * ux + P[1] * uy, F = [P[0] - d * ux, P[1] - d * uy];
      seg(f, [0, 0], P, GREY, 1.6, [5, 4]);
      seg(f, [0, 0], F, RED, 2.6);
      dot(f, 0, 0, ink(), "pole"); dot(f, P[0], P[1], BLUE, "P"); dot(f, F[0], F[1], RED, "foot");
      f.end();
      return { r: Math.hypot(P[0], P[1]), p: Math.hypot(F[0], F[1]) };
    }
    var card = function (x) { var r = a * (1 + Math.cos(x)); return { P: [r * Math.cos(x), r * Math.sin(x)], T: [-a * Math.sin(x) * Math.cos(x) - r * Math.sin(x), -a * Math.sin(x) * Math.sin(x) + r * Math.cos(x)] }; };
    var cpts = sample(function (x) { return card(x).P; }, 0, 2 * Math.PI, 240), cb = pad(bbox(cpts), 0.1);
    widget(box, ctx, {
      title: "(i) Cardioid r = " + a + "(1 + cos θ), pole at the origin", W: 520, H: 340,
      note: "The green line is the tangent at P. The red segment is the perpendicular from the pole to that tangent: its length is p.",
      sliders: [{ label: "θ", min: 0.05, max: 2 * Math.PI - 0.05, step: 0.01, val: Math.max(0.05, Math.acos(u)), fmt: function (t) { return nf(t * 180 / Math.PI) + "°"; } }],
      draw: function (cv, v) { var s = card(v[0]); pedalDraw(cv, s.P, s.T, cpts, cb, a * 3); },
      reads: function (v) { var s = card(v[0]), L = Math.hypot(s.T[0], s.T[1]), p = Math.abs(s.P[0] * s.T[1] - s.P[1] * s.T[0]) / L; return [["r", nf(Math.hypot(s.P[0], s.P[1]))], ["p", nf(p)], ["p²", nf(p * p)]]; }
    });
    var par = function (s) { return { P: [cc * s * s - cc, 2 * cc * s], T: [2 * cc * s, 2 * cc] }; };
    var ppts = sample(function (s) { return par(s).P; }, -3.2, 3.2, 240), pb = pad(bbox(ppts), 0.1);
    widget(box, ctx, {
      title: "(ii) Parabola y² = " + (4 * cc) + "x, pole at the focus", W: 520, H: 340,
      note: "Same idea: tangent in green, the perpendicular from the focus in red.",
      sliders: [{ label: "s (point is (" + cc + "s², " + (2 * cc) + "s))", min: -3.2, max: 3.2, step: 0.01, val: tp }],
      draw: function (cv, v) { var s = par(v[0]); pedalDraw(cv, s.P, s.T, ppts, pb, cc * 5); },
      reads: function (v) { var s = par(v[0]), L = Math.hypot(s.T[0], s.T[1]), p = Math.abs(s.P[0] * s.T[1] - s.P[1] * s.T[0]) / L; return [["r", nf(Math.hypot(s.P[0], s.P[1]))], ["p", nf(p)], ["p² ÷ r", nf(p * p / Math.hypot(s.P[0], s.P[1]))]]; }
    });
  }

  /* ---------- several variables ---------- */
  function polyf(co) { return function (x, y) { return co[0] * x * x * x + co[1] * x * x * y + co[2] * x * y * y + co[3] * y * y * y; }; }
  function slice(task, box, ctx, which) {
    var co = task.viz.co, px = task.viz.px, py = task.viz.py, f = polyf(co);
    var X = which === "x";
    var g = function (t) { return X ? f(t, py) : f(px, t); };
    var d = function (t) { return X ? 3 * co[0] * t * t + 2 * co[1] * t * py + co[2] * py * py : co[1] * px * px + 2 * co[2] * px * t + 3 * co[3] * t * t; };
    var c0 = X ? px : py, pts = sample(function (t) { return [t, g(t)]; }, c0 - 3, c0 + 3, 200), b = pad(bbox(pts), 0.1);
    widget(box, ctx, {
      title: X ? "Slice of your surface along x (y fixed at " + py + ")" : "Slice of your surface along y (x fixed at " + px + ")",
      note: "Hold one variable fixed and you get an ordinary curve. The slope of the green tangent is the partial derivative.",
      W: 520, H: 300, sliders: [{ label: X ? "x" : "y", min: c0 - 3, max: c0 + 3, step: 0.02, val: c0 }],
      draw: function (cv, v) {
        var fr_ = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, b[0], b[1], b[2], b[3], false), t = v[0];
        path(fr_, pts, BLUE, 2.4);
        var m = d(t), y = g(t);
        seg(fr_, [t - 1, y - m], [t + 1, y + m], GREEN, 2);
        dot(fr_, t, y, RED, X ? "(x, f)" : "(y, f)");
        fr_.end();
      },
      reads: function (v) { return [[X ? "∂f/∂x here" : "∂f/∂y here", nf(d(v[0]))], ["f here", nf(g(v[0]))]]; }
    });
  }
  function poly3(task, box, ctx) {
    if (task.id === "3.1") { slice(task, box, ctx, "x"); slice(task, box, ctx, "y"); return; }
    var co = task.viz.co, px = task.viz.px, py = task.viz.py, F0 = polyf(co)(px, py);
    var G = function (t) { return t * t * t * F0; }, pts = sample(function (t) { return [t, G(t)]; }, 0, 2, 120), b = pad(bbox(pts.concat([[0, 0]])), 0.15);
    widget(box, ctx, {
      title: "Walk from the origin through (" + px + ", " + py + ")",
      note: "Along this ray f is a function of t alone: g(t) = f(tx, ty). The red parabola is the best-fitting parabola at the slider point; its curvature is g″(t).",
      W: 520, H: 320, sliders: [{ label: "t", min: 0.2, max: 1.8, step: 0.01, val: 1 }],
      draw: function (cv, v) {
        var f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, b[0], b[1], b[2], b[3], false), t = v[0];
        path(f, pts, BLUE, 2.4);
        var g0 = G(t), g1 = 3 * t * t * F0, g2 = 6 * t * F0;
        path(f, sample(function (s) { return [s, g0 + g1 * (s - t) + 0.5 * g2 * (s - t) * (s - t)]; }, Math.max(0, t - 0.7), Math.min(2, t + 0.7), 60), RED, 2.2);
        dot(f, t, g0, RED, "t = " + nf(t));
        f.end();
      },
      reads: function (v) { var t = v[0]; return [["g(t)", nf(G(t))], ["g′(t)", nf(3 * t * t * F0)], ["g″(t)", nf(6 * t * F0)], ["f at your point", nf(F0)]]; }
    });
  }

  function jac(task, box, ctx) {
    var v = task.viz, p = v.p, q = v.q, r = v.r, s = v.s, x0 = v.x, y0 = v.y;
    var U = function (x, y) { return p * x * x - q * y; }, V = function (x, y) { return r * x * y + s * x; };
    var ux = 2 * p * x0, uy = -q, vx = r * y0 + s, vy = r * x0, J = ux * vy - uy * vx;
    function boundary(h) {
      var pts = [], n = 24, i;
      for (i = 0; i < n; i++) pts.push([x0 + h * i / n, y0]);
      for (i = 0; i < n; i++) pts.push([x0 + h, y0 + h * i / n]);
      for (i = 0; i < n; i++) pts.push([x0 + h - h * i / n, y0 + h]);
      for (i = 0; i < n; i++) pts.push([x0, y0 + h - h * i / n]);
      return pts;
    }
    function img(h) { return boundary(h).map(function (P) { return [U(P[0], P[1]), V(P[0], P[1])]; }); }
    function area(P) { var a = 0, i; for (i = 0; i < P.length; i++) { var j = (i + 1) % P.length; a += P[i][0] * P[j][1] - P[j][0] * P[i][1]; } return a / 2; }
    var big = img(1), bb = pad(bbox(big.concat([[U(x0, y0), V(x0, y0)]])), 0.12);
    widget(box, ctx, {
      title: "A small square near (" + x0 + ", " + y0 + ") and where the map (x, y) → (u, v) sends it", W: 560, H: 300,
      note: "Left: the square in the xy-plane. Right: its image in the uv-plane (solid) and the straight-edged parallelogram predicted by the derivatives (dashed). Shrink the square: the area ratio settles to the Jacobian.",
      sliders: [{ label: "side h", min: 0.02, max: 1, step: 0.01, val: 0.5 }],
      draw: function (cv, vv) {
        var h = vv[0], L = view(cv, { x: 0, y: 0, w: 280, h: 300 }, x0 - 0.15, x0 + 1.15, y0 - 0.15, y0 + 1.15, true);
        path(L, boundary(h).concat([[x0, y0]]), BLUE, 2.4); dot(L, x0, y0, RED, "(x, y)"); L.end();
        var R = view(cv, { x: 280, y: 0, w: 280, h: 300 }, bb[0], bb[1], bb[2], bb[3], true), u0 = U(x0, y0), v0 = V(x0, y0);
        path(R, img(h).concat([[u0, v0]]), BLUE, 2.4);
        path(R, [[u0, v0], [u0 + ux * h, v0 + vx * h], [u0 + ux * h + uy * h, v0 + vx * h + vy * h], [u0 + uy * h, v0 + vy * h], [u0, v0]], RED, 1.6, [5, 4]);
        dot(R, u0, v0, RED, "(u, v)"); R.end();
        var c = cv.getContext("2d"); c.fillStyle = ink(); c.font = "13px system-ui, sans-serif"; c.fillText("xy-plane", 10, 292); c.fillText("uv-plane", 290, 292);
      },
      reads: function (vv) { var h = vv[0]; return [["area ratio (image ÷ h²)", nf(Math.abs(area(img(h))) / (h * h))], ["Jacobian ∂(u,v)/∂(x,y)", nf(J)]]; }
    });
  }

  function taylor(task, box, ctx) {
    var hh = task.viz.h, ta = task.viz.a, tb = task.viz.b;
    var H = function (x, y) { return hh[0] * x * x * x + hh[1] * x * x * y + hh[2] * x * y * y + hh[3] * y * y * y + hh[4] * x * x + hh[5] * x * y + hh[6] * y * y; };
    var cxx = 3 * hh[0] * ta + hh[1] * tb + hh[4], cxy = 2 * hh[1] * ta + 2 * hh[2] * tb + hh[5];
    function coefs(lam) {
      var f = function (d) { return H(ta + d, tb + lam * d); }, c0 = f(0), p1 = f(1), m1 = f(-1), p2 = f(2);
      var c2 = (p1 + m1) / 2 - c0, S = (p1 - m1) / 2, c3 = (p2 - c0 - 4 * c2 - 2 * S) / 6;
      return [c0, S - c3, c2, c3];
    }
    var lam0 = 0;
    var base = sample(function (d) { return [d, H(ta + d, tb)]; }, -2, 2, 100), ymm = bbox(base);
    widget(box, ctx, {
      title: "Taylor polynomials of your function, along a line through (" + ta + ", " + tb + ")",
      note: "Blue: h along the line y − " + tb + " = slope·(x − " + ta + "). Red: its Taylor polynomial of the chosen order. Order 3 is exact for this function. Turn the slope to see the cross term matter.",
      W: 560, H: 320,
      sliders: [{ label: "order n", min: 1, max: 3, step: 1, val: 2, fmt: function (v) { return String(Math.round(v)); } },
                { label: "slope of the line", min: -2, max: 2, step: 0.1, val: lam0 }],
      draw: function (cv, v) {
        var n = Math.round(v[0]), lam = v[1], c = coefs(lam), i;
        var ds = sample(function (d) { return d; }, -2, 2, 160);
        var pts = ds.map(function (d) { return [d, H(ta + d, tb + lam * d)]; });
        var lo = 1e18, hi = -1e18; pts.forEach(function (P) { lo = Math.min(lo, P[1]); hi = Math.max(hi, P[1]); });
        var padv = (hi - lo) * 0.15 || 1, f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, -2, 2, lo - padv, hi + padv, false);
        path(f, pts, BLUE, 2.6);
        path(f, ds.map(function (d) { var s = 0; for (i = 0; i <= n; i++) s += c[i] * Math.pow(d, i); return [d, s]; }), RED, 2.2, [6, 4]);
        dot(f, 0, c[0], GREEN, "(a, b)");
        f.end();
      },
      reads: function (v) {
        var c = coefs(v[1]);
        return [["coefficient of (x−a)²", nf(cxx)], ["coefficient of (x−a)(y−b)", nf(cxy)], ["quadratic coefficient on this line", nf(c[2])]];
      }
    });
  }

  function surface(task, box, ctx) {
    var v = task.viz, al = v.al, be = v.be, p = v.p, q = v.q, K = v.K, Rr = Math.max(p, q) * 1.8, S = 340;
    var g = function (x, y) { return al * x * x * x + be * y * y * y - 3 * al * p * p * x - 3 * be * q * q * y + K; };
    var off = document.createElement("canvas"); off.width = S; off.height = S;
    var oc = off.getContext("2d"), img = oc.createImageData(S, S), vals = new Float32Array(S * S), i, j;
    for (j = 0; j < S; j++) for (i = 0; i < S; i++) vals[j * S + i] = g(-Rr + 2 * Rr * i / (S - 1), Rr - 2 * Rr * j / (S - 1));
    var sorted = Array.prototype.slice.call(vals).sort(function (a, b) { return a - b; }), lo = sorted[Math.floor(S * S * 0.02)], hi = sorted[Math.floor(S * S * 0.98)];
    for (i = 0; i < vals.length; i++) {
      var tt = Math.max(0, Math.min(1, (vals[i] - lo) / (hi - lo))), k = i * 4;
      img.data[k] = 30 + 200 * tt; img.data[k + 1] = 40 + 170 * tt * tt + 30 * tt; img.data[k + 2] = 110 + 200 * (1 - tt) * tt + 40 * tt; img.data[k + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    var X = function (x) { return (x + Rr) / (2 * Rr) * (S - 1); }, Y = function (y) { return (Rr - y) / (2 * Rr) * (S - 1); };
    widget(box, ctx, {
      title: "Explore your surface g(x, y)", W: S, H: S,
      note: "Light = high, dark = low. Slide the point around. The arrow shows the direction of steepest climb. It shrinks to nothing at a critical point.",
      sliders: [{ label: "x", min: -Rr, max: Rr, step: 0.02, val: 0 }, { label: "y", min: -Rr, max: Rr, step: 0.02, val: 0 }],
      draw: function (cv, vv) {
        var c = cv.getContext("2d"), x = vv[0], y = vv[1], gx = 3 * al * (x * x - p * p), gy = 3 * be * (y * y - q * q);
        c.drawImage(off, 0, 0);
        var m = Math.hypot(gx, gy), sc = m > 0 ? Math.min(60, 60 * m / (3 * Math.max(al, be) * Rr * Rr)) / m : 0;
        c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x) + gx * sc, Y(y) - gy * sc); c.stroke();
        c.fillStyle = "#ffd34d"; c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.arc(X(x), Y(y), 7, 0, 7); c.fill(); c.stroke();
        var D = 36 * al * be * x * y, rr = 6 * al * x, kind = D < 0 ? "saddle-like" : rr > 0 ? "bowl-like (minimum type)" : rr < 0 ? "hill-like (maximum type)" : "flat";
        c.fillStyle = "#fff"; c.font = "bold 13px system-ui, sans-serif"; c.fillText("here the shape is " + kind, 8, 20);
      },
      reads: function (vv) {
        var x = vv[0], y = vv[1];
        return [["g", nf(g(x, y))], ["g_x", nf(3 * al * (x * x - p * p))], ["g_y", nf(3 * be * (y * y - q * q))], ["rt − s²", nf(36 * al * be * x * y)]];
      }
    });
  }

  function lagr(task, box, ctx) {
    var A = task.viz.A, B = task.viz.B, C = task.viz.C, n = Math.hypot(A, B), d = C / n, E = 1.9 * d;
    widget(box, ctx, {
      title: "Grow the circle x² + y² = r² until it just reaches the line " + A + "x + " + B + "y = " + C, W: 520, H: 420,
      note: "The closest point of the line to the origin is where the growing circle first touches it. At that moment the radius and the line's normal point the same way: that is the Lagrange condition.",
      sliders: [{ label: "radius r", min: 0.05 * d, max: 1.8 * d, step: d / 300, val: 0.4 * d }],
      draw: function (cv, v) {
        var f = view(cv, { x: 0, y: 0, w: cv.width, h: cv.height }, -E, E, -E, E, true), r = v[0], ux = A / n, uy = B / n, tx = -uy, ty = ux;
        seg(f, [ux * d - tx * 3 * E, uy * d - ty * 3 * E], [ux * d + tx * 3 * E, uy * d + ty * 3 * E], GREEN, 2.4);
        var near = Math.abs(r - d) < d * 0.012;
        circle(f, 0, 0, r, near ? RED : BLUE, near ? 3.4 : 2.2);
        dot(f, 0, 0, ink(), "origin");
        if (near) { seg(f, [0, 0], [ux * d, uy * d], RED, 2); dot(f, ux * d, uy * d, RED, "touch"); }
        else if (r > d) { var h = Math.sqrt(r * r - d * d); dot(f, ux * d + tx * h, uy * d + ty * h, BLUE); dot(f, ux * d - tx * h, uy * d - ty * h, BLUE); }
        var st = near ? "the circle just touches the line" : r < d ? "the circle has not reached the line" : "the circle cuts the line in two points";
        f.c.fillStyle = ink(); f.c.font = "bold 14px system-ui, sans-serif"; f.c.fillText(st, 12, 24);
        f.end();
      },
      reads: function (v) { return [["r²", nf(v[0] * v[0])], ["r² at the touching moment", nf(C * C / (A * A + B * B))], ["x of that point", nf(A * C / (A * A + B * B))]]; }
    });
  }

  var KINDS = { parab: parab, ellipse: ellipse, spiral: spiral, cycloid: cycloid, env1: env1, env2: env2, pedal: pedal, poly3: poly3, jac: jac, taylor: taylor, surface: surface, lagr: lagr };

  /* ---------- public API ---------- */
  function stopAll() { running.forEach(function (f) { try { f(); } catch (e) {} }); running = []; }

  /* adds a collapsed "Visualise this question" panel to a task card */
  function attach(card, task, unlocked) {
    if (!task.viz || !KINDS[task.viz.kind]) return;
    var det = el("details", { class: "viz" }), body = el("div");
    det.appendChild(el("summary", { text: "▶ Visualise this question (play with it)" }));
    det.appendChild(body);
    var built = false;
    det.addEventListener("toggle", function () {
      if (det.open && !built) {
        built = true;
        try { KINDS[task.viz.kind](task, body, { unlocked: unlocked }); } catch (e) { body.textContent = "The picture could not be drawn on this device."; }
      }
      if (!det.open) stopAll();
    });
    card.appendChild(det);
  }

  root.PassportViz = { attach: attach, stopAll: stopAll, KINDS: KINDS };
  if (typeof module !== "undefined") module.exports = root.PassportViz;
})(typeof window !== "undefined" ? window : globalThis);
