/* viz.js - drawing helpers shared by the question pictures (vq.js) and the task labs (lab.js).
   Plain canvas, no libraries. Colours follow the page theme (light and dark). */
(function () {
  "use strict";
  var V = window.ExamViz = window.ExamViz || {};
  function css(n, f) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || f; }
  V.col = function () { return { ink: css("--ink", "#1d2433"), mute: css("--mute", "#6b7385"), line: css("--line", "#e2ddd0"), a: css("--accent", "#b4442b"), b: css("--p1", "#1f6f8b"), c: css("--p2", "#7a4fa3"), d: css("--p3", "#2f7d4f"), ok: css("--ok", "#1d7a46"), bad: css("--bad", "#b3261e") }; };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  V.el = el;
  V.f2 = function (x) { if (!isFinite(x)) return "—"; var r = Math.round(x * 100) / 100; return String(Object.is(r, -0) ? 0 : r); };
  V.tick = function (t) { return Math.abs(t) > 0 && Math.abs(t) < 0.01 ? t.toExponential(0) : V.f3(+t.toPrecision(6)); };
  V.f3 = function (x) { if (!isFinite(x)) return "—"; var r = Math.round(x * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); };

  function niceStep(span, target) {
    var raw = span / target, e = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }

  /* a plot area with its own coordinates */
  function Plot(parent, o) {
    o = o || {};
    var W = o.w || 360, H = o.h || 250, p = {}, cv = el("canvas", "vcv");
    cv.width = W * 2; cv.height = H * 2;
    cv.style.cssText = "width:100%;max-width:" + W + "px;height:auto;aspect-ratio:" + W + "/" + H + ";display:block;margin:4px auto";
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", o.label || "diagram");
    parent.appendChild(cv);
    var c = cv.getContext("2d"), m = o.pad == null ? 26 : o.pad;
    p.cv = cv; p.c = c; p.W = W; p.H = H; p.m = m; p.x0 = -1; p.x1 = 1; p.y0 = -1; p.y1 = 1; p.eq = false;
    p.range = function (a, b, y0, y1, eq) {
      if (a === b) { a -= 1; b += 1; } if (y0 === y1) { y0 -= 1; y1 += 1; }
      if (eq) {
        var pw = W - 2 * m, ph = H - 2 * m, s = Math.max((b - a) / pw, (y1 - y0) / ph), cx = (a + b) / 2, cy = (y0 + y1) / 2;
        a = cx - s * pw / 2; b = cx + s * pw / 2; y0 = cy - s * ph / 2; y1 = cy + s * ph / 2;
      }
      p.x0 = a; p.x1 = b; p.y0 = y0; p.y1 = y1; p.eq = !!eq;
    };
    p.X = function (x) { return m + (x - p.x0) / (p.x1 - p.x0) * (W - 2 * m); };
    p.Y = function (y) { return H - m - (y - p.y0) / (p.y1 - p.y0) * (H - 2 * m); };
    p.clear = function () { c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, W, H); };
    function clipped(fn) { c.save(); c.beginPath(); c.rect(m - 1, m - 1, W - 2 * m + 2, H - 2 * m + 2); c.clip(); fn(); c.restore(); }
    p.clipped = clipped;
    p.axes = function (o2) {
      o2 = o2 || {}; var K = V.col(), sx = niceStep(p.x1 - p.x0, 6), sy = niceStep(p.y1 - p.y0, 5), t;
      c.font = "10px system-ui,sans-serif"; c.lineWidth = 1;
      if (!o2.nogrid) {
        c.strokeStyle = K.line;
        for (t = Math.ceil(p.x0 / sx) * sx; t <= p.x1 + 1e-9; t += sx) { c.beginPath(); c.moveTo(p.X(t), m); c.lineTo(p.X(t), H - m); c.stroke(); }
        for (t = Math.ceil(p.y0 / sy) * sy; t <= p.y1 + 1e-9; t += sy) { c.beginPath(); c.moveTo(m, p.Y(t)); c.lineTo(W - m, p.Y(t)); c.stroke(); }
      }
      c.strokeStyle = K.mute; c.fillStyle = K.mute;
      var ax = p.y0 <= 0 && p.y1 >= 0 ? p.Y(0) : H - m, ay = p.x0 <= 0 && p.x1 >= 0 ? p.X(0) : m;
      c.beginPath(); c.moveTo(m, ax); c.lineTo(W - m, ax); c.moveTo(ay, m); c.lineTo(ay, H - m); c.stroke();
      c.textAlign = "center"; c.textBaseline = "top";
      for (t = Math.ceil(p.x0 / sx) * sx; t <= p.x1 + 1e-9; t += sx) if (Math.abs(t) > sx / 100) c.fillText(V.tick(t), p.X(t), Math.min(ax + 3, H - m + 2));
      c.textAlign = "right"; c.textBaseline = "middle";
      for (t = Math.ceil(p.y0 / sy) * sy; t <= p.y1 + 1e-9; t += sy) if (Math.abs(t) > sy / 100) c.fillText(V.tick(t), Math.max(ay - 3, m - 2), p.Y(t));
      if (o2.xl) { c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText(o2.xl, W - 2, H - 2); }
      if (o2.yl) { c.textAlign = "left"; c.textBaseline = "top"; c.fillText(o2.yl, 2, 2); }
    };
    p.path = function (pts, color, lw, dash) {
      clipped(function () {
        c.strokeStyle = color; c.lineWidth = lw || 2; c.setLineDash(dash || []); c.lineJoin = "round"; c.beginPath();
        var pen = false;
        pts.forEach(function (q) { if (!q || !isFinite(q[0]) || !isFinite(q[1])) { pen = false; return; } if (!pen) { c.moveTo(p.X(q[0]), p.Y(q[1])); pen = true; } else c.lineTo(p.X(q[0]), p.Y(q[1])); });
        c.stroke(); c.setLineDash([]);
      });
    };
    p.fn = function (f, a, b, color, lw, dash, n) {
      var pts = [], i; n = n || 240;
      for (i = 0; i <= n; i++) { var x = a + (b - a) * i / n, y; try { y = f(x); } catch (e) { y = NaN; } pts.push([x, y]); }
      p.path(pts, color, lw, dash);
    };
    p.param = function (fx, fy, a, b, color, lw, dash, n) {
      var pts = [], i; n = n || 300;
      for (i = 0; i <= n; i++) { var t = a + (b - a) * i / n; pts.push([fx(t), fy(t)]); }
      p.path(pts, color, lw, dash);
    };
    p.seg = function (x1, y1, x2, y2, color, lw, dash) { p.path([[x1, y1], [x2, y2]], color, lw, dash); };
    p.line = function (px, py, dx, dy, color, lw, dash) { var L = 1e4 * Math.max(p.x1 - p.x0, p.y1 - p.y0), n = Math.hypot(dx, dy) || 1; p.seg(px - dx / n * L, py - dy / n * L, px + dx / n * L, py + dy / n * L, color, lw, dash); };
    p.arrow = function (x1, y1, x2, y2, color, lw) {
      clipped(function () {
        var a = [p.X(x1), p.Y(y1)], b = [p.X(x2), p.Y(y2)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = 8;
        c.strokeStyle = color; c.fillStyle = color; c.lineWidth = lw || 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - hl * Math.cos(ang - 0.4), b[1] - hl * Math.sin(ang - 0.4)); c.lineTo(b[0] - hl * Math.cos(ang + 0.4), b[1] - hl * Math.sin(ang + 0.4)); c.closePath(); c.fill();
      });
    };
    p.dot = function (x, y, color, r) { clipped(function () { c.fillStyle = color; c.beginPath(); c.arc(p.X(x), p.Y(y), r || 4, 0, 7); c.fill(); }); };
    p.ring = function (x, y, color, r) { clipped(function () { c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.arc(p.X(x), p.Y(y), r || 6, 0, 7); c.stroke(); }); };
    p.circle = function (x, y, r, color, lw, dash, fill) {
      clipped(function () {
        c.beginPath(); c.ellipse(p.X(x), p.Y(y), Math.abs(r / (p.x1 - p.x0) * (W - 2 * m)), Math.abs(r / (p.y1 - p.y0) * (H - 2 * m)), 0, 0, 7);
        if (fill) { c.fillStyle = fill; c.fill(); }
        c.strokeStyle = color; c.lineWidth = lw || 2; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
      });
    };
    p.poly = function (pts, stroke, fill, lw) {
      clipped(function () {
        c.beginPath(); pts.forEach(function (q, i) { if (i) c.lineTo(p.X(q[0]), p.Y(q[1])); else c.moveTo(p.X(q[0]), p.Y(q[1])); }); c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
      });
    };
    p.text = function (x, y, s, color, align, dx, dy) { c.font = "12px system-ui,sans-serif"; c.fillStyle = color || V.col().ink; c.textAlign = align || "left"; c.textBaseline = "middle"; c.fillText(s, p.X(x) + (dx || 0), p.Y(y) + (dy || 0)); };
    p.slopes = function (F, nx, ny, color, len) {
      clipped(function () {
        var i, j, sx = (W - 2 * m) / (p.x1 - p.x0), sy = (H - 2 * m) / (p.y1 - p.y0); c.strokeStyle = color; c.lineWidth = 1;
        for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
          var x = p.x0 + (p.x1 - p.x0) * (i + 0.5) / nx, y = p.y0 + (p.y1 - p.y0) * (j + 0.5) / ny, s = F(x, y); if (!isFinite(s)) continue;
          var vx = 1, vy = -s * sy / sx, n = Math.hypot(vx, vy); vx = vx / n * len / 2; vy = vy / n * len / 2;
          c.beginPath(); c.moveTo(p.X(x) - vx, p.Y(y) - vy); c.lineTo(p.X(x) + vx, p.Y(y) + vy); c.stroke();
        }
      });
    };
    p.contour = function (f, levels, colorOf, lw) {
      var nx = 80, ny = 60, g = [], i, j;
      for (j = 0; j <= ny; j++) { g[j] = []; for (i = 0; i <= nx; i++) g[j][i] = f(p.x0 + (p.x1 - p.x0) * i / nx, p.y0 + (p.y1 - p.y0) * j / ny); }
      levels.forEach(function (L, li) {
        var col = typeof colorOf === "function" ? colorOf(L, li) : colorOf;
        clipped(function () {
          c.strokeStyle = col; c.lineWidth = lw || 1.2; c.beginPath();
          for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
            var x1 = p.x0 + (p.x1 - p.x0) * i / nx, x2 = p.x0 + (p.x1 - p.x0) * (i + 1) / nx, y1 = p.y0 + (p.y1 - p.y0) * j / ny, y2 = p.y0 + (p.y1 - p.y0) * (j + 1) / ny;
            var a = g[j][i], b = g[j][i + 1], cc = g[j + 1][i + 1], d = g[j + 1][i];
            if (!isFinite(a + b + cc + d)) continue;
            var cr = function (v1, v2, ax, ay, bx, by) { if ((v1 - L) * (v2 - L) < 0) { var t = (L - v1) / (v2 - v1); return [ax + (bx - ax) * t, ay + (by - ay) * t]; } return null; };
            var e = [cr(a, b, x1, y1, x2, y1), cr(b, cc, x2, y1, x2, y2), cr(d, cc, x1, y2, x2, y2), cr(a, d, x1, y1, x1, y2)], q = e.filter(Boolean);
            var seg = function (u, v) { c.moveTo(p.X(u[0]), p.Y(u[1])); c.lineTo(p.X(v[0]), p.Y(v[1])); };
            if (q.length === 2) seg(q[0], q[1]); else if (q.length === 4) { seg(e[0], e[3]); seg(e[1], e[2]); }
          }
          c.stroke();
        });
      });
    };
    return p;
  }
  V.Plot = Plot;

  /* a labelled slider; fn(value) is called on every move */
  V.slider = function (parent, label, min, max, step, val, fn, fmt) {
    var row = el("div", "vrow"), lab = el("label", null, label), inp = el("input"), out = el("span", "vval");
    inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = val; inp.setAttribute("aria-label", label);
    function upd() { out.textContent = fmt ? fmt(+inp.value) : String(+inp.value); }
    inp.addEventListener("input", function () { upd(); fn(+inp.value); });
    row.appendChild(lab); row.appendChild(inp); row.appendChild(out); parent.appendChild(row); upd();
    return { el: inp, get: function () { return +inp.value; }, set: function (v) { inp.value = v; upd(); } };
  };
  V.note = function (parent, cls) { var n = el("div", cls || "vnote"); parent.appendChild(n); return n; };

  /* ---- small maths helpers ---- */
  V.det2 = function (A) { return A[0][0] * A[1][1] - A[0][1] * A[1][0]; };
  V.det3 = function (A) { return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]); };
  V.mulv = function (A, v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; };
  V.cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
  V.dot = function (a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  V.eig2 = function (A) {
    var tr = A[0][0] + A[1][1], d = V.det2(A), disc = tr * tr / 4 - d;
    if (disc < -1e-12) return { real: false };
    var s = Math.sqrt(Math.max(0, disc)), l1 = tr / 2 - s, l2 = tr / 2 + s;
    function vec(l) { var a = A[0][0] - l, b = A[0][1]; if (Math.abs(a) + Math.abs(b) > 1e-9) return [-b, a]; var c = A[1][0], dd = A[1][1] - l; if (Math.abs(c) + Math.abs(dd) > 1e-9) return [-dd, c]; return [1, 0]; }
    var v1 = vec(l1), v2 = vec(l2);
    if (Math.abs(l1 - l2) < 1e-9) { v1 = vec(l1); v2 = v1; }
    var n1 = Math.hypot(v1[0], v1[1]), n2 = Math.hypot(v2[0], v2[1]);
    return { real: true, l1: l1, l2: l2, v1: [v1[0] / n1, v1[1] / n1], v2: [v2[0] / n2, v2[1] / n2] };
  };
  /* real roots of a polynomial given as function, by scanning and bisection */
  V.roots = function (f, a, b) {
    var out = [], n = 2000, i, x0 = a, y0 = f(a);
    for (i = 1; i <= n; i++) {
      var x1 = a + (b - a) * i / n, y1 = f(x1);
      if (y0 === 0) out.push(x0); else if (y0 * y1 < 0) { var lo = x0, hi = x1, k; for (k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; } out.push((lo + hi) / 2); }
      x0 = x1; y0 = y1;
    }
    return out;
  };
  V.charpoly3 = function (A) {
    var c1 = A[0][0] + A[1][1] + A[2][2];
    var c2 = (A[0][0] * A[1][1] - A[0][1] * A[1][0]) + (A[0][0] * A[2][2] - A[0][2] * A[2][0]) + (A[1][1] * A[2][2] - A[1][2] * A[2][1]);
    return [c1, c2, V.det3(A)];
  };
  V.legendre = function (n, x) { var p0 = 1, p1 = x, k, p2; if (n === 0) return 1; for (k = 1; k < n; k++) { p2 = ((2 * k + 1) * x * p1 - k * p0) / (k + 1); p0 = p1; p1 = p2; } return p1; };
  V.range = function (arr) { var lo = Infinity, hi = -Infinity; arr.forEach(function (v) { if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }); return [lo, hi]; };

  /* a simple spinning 3-D view: draw(pr) gets the projection function */
  V.view3 = function (box, pts, draw, label) {
    var R = 1; pts.forEach(function (q) { R = Math.max(R, Math.hypot(q[0], q[1], q[2])); }); R *= 1.05;
    var P = Plot(box, { label: label || "3-D picture", pad: 8 }); P.range(-R, R, -R, R, true);
    var ang = 0.7, T = 0.5;
    function pr(v) { var ca = Math.cos(ang), sa = Math.sin(ang), x = v[0] * ca - v[1] * sa, y = v[0] * sa + v[1] * ca; return [x, v[2] * Math.cos(T) + y * Math.sin(T)]; }
    function redraw() { P.clear(); draw(pr, P); }
    V.slider(box, "turn the view", 0, 360, 5, 40, function (v) { ang = v * Math.PI / 180; redraw(); }, function (v) { return v + "°"; });
    ang = 40 * Math.PI / 180; redraw();
    return { P: P, redraw: redraw };
  };
  V.sum = function (f, a, b) { var s = 0, k; for (k = a; k <= b; k++) s += f(k); return s; };
})();
