/* vq.js - "See it": one picture per question, drawn from the student's own numbers.
   ExamViz.question(qid, p, st) returns a <div>. p = the numbers of this student's variant, st.solved = already confirmed. */
(function () {
  "use strict";
  var V = window.ExamViz, el = V.el, f2 = V.f2, f3 = V.f3, Plot = V.Plot, PI = Math.PI;
  var Q = {}, CAP = {}, REV = {};   /* REV[qid](box, p) -> text shown after the question is confirmed */

  /* ---------- helpers ---------- */
  function eigenExplorer(box, A, sym) {
    var K = V.col(), E = V.eig2(A);
    var ata = [[A[0][0] * A[0][0] + A[1][0] * A[1][0], A[0][0] * A[0][1] + A[1][0] * A[1][1]], [0, A[0][1] * A[0][1] + A[1][1] * A[1][1]]]; ata[1][0] = ata[0][1];
    var sm = Math.sqrt(Math.max((ata[0][0] + ata[1][1]) / 2 + Math.sqrt(Math.pow((ata[0][0] - ata[1][1]) / 2, 2) + ata[0][1] * ata[0][1]), 1e-9)), sc = 1 / sm;
    var P = Plot(box, { label: "unit circle, its image under the matrix, and a vector v with A v" }); P.range(-1.25, 1.25, -1.25, 1.25, true);
    var out = V.note(box), th = 30;
    function draw() {
      K = V.col(); P.clear(); P.axes({ nogrid: true });
      P.circle(0, 0, 1, K.line, 1.5);
      var im = []; for (var i = 0; i <= 120; i++) { var t = i / 120 * 2 * PI, w = V.mulv(A, [Math.cos(t), Math.sin(t)]); im.push([w[0] * sc, w[1] * sc]); }
      P.path(im, K.mute, 1.5, [4, 3]);
      if (E.real) [E.v1, E.v2].forEach(function (u) { P.line(0, 0, u[0], u[1], K.line, 1, [2, 4]); });
      var v = [Math.cos(th * PI / 180), Math.sin(th * PI / 180)], Av = V.mulv(A, v);
      P.arrow(0, 0, v[0], v[1], K.b, 2.5); P.arrow(0, 0, Av[0] * sc, Av[1] * sc, K.a, 2.5);
      P.text(v[0], v[1], "v", K.b, "left", 6, -6); P.text(Av[0] * sc, Av[1] * sc, "Av", K.a, "left", 6, -6);
      var n = Math.hypot(Av[0], Av[1]), cr = v[0] * Av[1] - v[1] * Av[0], dt = v[0] * Av[0] + v[1] * Av[1], ang = Math.atan2(Math.abs(cr), dt) * 180 / PI;
      var par = n > 1e-9 && (ang < 2 || ang > 178);
      out.innerHTML = ""; out.appendChild(document.createTextNode("angle between v and Av = " + f2(ang) + "°. "));
      var b = el("b", null, par ? "Av lies along v, so v is an eigenvector and λ ≈ " + f2(dt) + "." : "Turn v until Av lines up with v.");
      b.style.color = par ? K.ok : K.mute; out.appendChild(b);
      out.appendChild(el("div", "small", "(Av is drawn shrunk by the same factor for every direction, so only its direction matters.)"));
    }
    V.slider(box, "direction of v", 0, 180, 0.5, th, function (x) { th = x; draw(); }, function (x) { return x + "°"; });
    draw(); return { P: P };
  }
  function charPlot(box, c, extra) {
    var f = function (x) { return x * x * x - c[0] * x * x + c[1] * x - c[2]; }, B = 1 + Math.max(Math.abs(c[0]), Math.abs(c[1]), Math.abs(c[2]));
    var rs = V.roots(f, -B, B), lo = rs.length ? Math.min.apply(null, rs) : -3, hi = rs.length ? Math.max.apply(null, rs) : 3, sp = Math.max(hi - lo, 4), a = lo - 0.35 * sp, b = hi + 0.35 * sp;
    var crit = V.roots(function (x) { return 3 * x * x - 2 * c[0] * x + c[1]; }, a, b), ym = 1;
    crit.forEach(function (x) { ym = Math.max(ym, Math.abs(f(x))); }); rs.forEach(function () { }); ym = Math.max(ym * 1.5, 5);
    var P = Plot(box, { label: "graph of the characteristic polynomial" }); P.range(a, b, -ym, ym); var K = V.col();
    P.clear(); P.axes({ xl: "λ", yl: "p(λ)" }); P.fn(f, a, b, K.b, 2.5, null, 400);
    rs.forEach(function (r) { P.dot(r, 0, K.a, 5); P.text(r, 0, f2(r), K.a, "center", 0, -12); });
    return P;
  }
  function osc(box, fx, fy, t0, t1, tinit, o) {
    o = o || {}; var P = Plot(box, { label: "curve with its circle of curvature" }), K = V.col(), pts = [], i, t, bb = [Infinity, -Infinity, Infinity, -Infinity];
    for (i = 0; i <= 400; i++) { t = t0 + (t1 - t0) * i / 400; var x = fx(t), y = fy(t); pts.push([x, y]); bb[0] = Math.min(bb[0], x); bb[1] = Math.max(bb[1], x); bb[2] = Math.min(bb[2], y); bb[3] = Math.max(bb[3], y); }
    var px = (bb[1] - bb[0]) * 0.12 + 1e-6, py = (bb[3] - bb[2]) * 0.12 + 1e-6; P.range(bb[0] - px, bb[1] + px, bb[2] - py, bb[3] + py, true);
    var out = V.note(box), cur = tinit, api = { rho: NaN };
    function geo(t) {
      var h = (t1 - t0) * 1e-4, x1 = (fx(t + h) - fx(t - h)) / (2 * h), y1 = (fy(t + h) - fy(t - h)) / (2 * h), x2 = (fx(t + h) - 2 * fx(t) + fx(t - h)) / (h * h), y2 = (fy(t + h) - 2 * fy(t) + fy(t - h)) / (h * h);
      var sp = Math.hypot(x1, y1), k = (x1 * y2 - y1 * x2) / (sp * sp * sp), X = fx(t), Y = fy(t);
      return { k: k, rho: 1 / Math.abs(k), cx: X - y1 / sp / k, cy: Y + x1 / sp / k, x: X, y: Y };
    }
    function draw() {
      K = V.col(); P.clear(); P.axes(); P.path(pts, K.b, 2.5);
      var g = geo(cur); api.rho = g.rho; api.g = g;
      if (isFinite(g.rho) && g.rho < 1e7) { P.circle(g.cx, g.cy, g.rho, K.a, 2, [5, 3]); P.seg(g.x, g.y, g.cx, g.cy, K.a, 1.5); P.dot(g.cx, g.cy, K.a, 4); }
      else P.line(g.x, g.y, 1, 0, K.a, 1.5, [5, 3]);
      P.dot(g.x, g.y, K.ink, 5);
      out.textContent = "At the point shown: ρ = " + (g.rho < 0.02 ? "0 (a cusp: the curve turns on the spot)" : isFinite(g.rho) && g.rho < 1e7 ? f2(g.rho) : "very large (almost straight)") + (g.rho < 0.02 ? "." : ", curvature κ = 1/ρ = " + f3(Math.abs(g.k)) + ".") + " The dashed circle is the circle of curvature (it hugs the curve best here)." + (o.road && isFinite(g.rho) ? " Road-bend speed limit if 1 unit = 10 m and tyre friction 0.7: about " + f2(3.6 * Math.sqrt(0.7 * 9.8 * 10 * g.rho)) + " km/h." : "");
    }
    V.slider(box, o.label || "position on the curve", t0, t1, (t1 - t0) / 400, tinit, function (v) { cur = v; draw(); }, function (v) { return f2(v); });
    draw(); box.__api = api; return api;
  }
  function seq(box, f, N, lines, o) {
    o = o || {}; var P = Plot(box, { label: o.label || "terms of the sequence", h: o.h || 210 }), K = V.col(), pts = [], i;
    for (i = (o.from || 1); i <= N; i++) pts.push([i, f(i)]);
    var yr = V.range(pts.map(function (q) { return q[1]; })); (lines || []).forEach(function (l) { yr[0] = Math.min(yr[0], l[0]); yr[1] = Math.max(yr[1], l[0]); });
    if (o.clamp) { yr[0] = Math.max(yr[0], o.clamp[0]); yr[1] = Math.min(yr[1], o.clamp[1]); }
    var pad = (yr[1] - yr[0]) * 0.15 || 1; P.range(o.from || 1, N, yr[0] - pad, yr[1] + pad); P.clear(); P.axes({ xl: "n", yl: o.yl });
    (lines || []).forEach(function (l) { P.seg(P.x0, l[0], P.x1, l[0], l[1] || K.a, 1.5, [5, 3]); P.text(P.x1, l[0], l[2] || "", l[1] || K.a, "right", -2, -9); });
    P.path(pts, K.mute, 1); pts.forEach(function (q) { P.dot(q[0], q[1], K.b, 3); });
    return P;
  }

  /* ================= Task 1 ================= */
  CAP["1.1"] = "The rows of A are three edges of a box. |det A| is the volume of the box; the sign says whether the three edges are right-handed. Turn the view and see how the box looks.";
  Q["1.1"] = function (box, p, st) {
    var A = p.A, verts = [], m, note = V.note(box);
    for (m = 0; m < 8; m++) verts.push([0, 1, 2].reduce(function (s, k) { return (m >> k & 1) ? [s[0] + A[k][0], s[1] + A[k][1], s[2] + A[k][2]] : s; }, [0, 0, 0]));
    V.view3(box, verts, function (pr, P) {
      var K = V.col(), cols = [K.a, K.b, K.d], b, mm;
      for (mm = 0; mm < 8; mm++) for (b = 0; b < 3; b++) if (!(mm >> b & 1)) { var u = pr(verts[mm]), w = pr(verts[mm | (1 << b)]); P.seg(u[0], u[1], w[0], w[1], cols[b], 2); }
      var o = pr([0, 0, 0]); P.dot(o[0], o[1], K.ink, 4);
    }, "box with edges equal to the rows of A");
    box.__reveal = function () { note.textContent = "Volume of the box = |det A| = " + f2(Math.abs(V.det3(A))) + "; det A = " + f2(V.det3(A)) + "."; };
    if (st.solved) box.__reveal();
  };
  CAP["1.2"] = "v1 and v2 span a flat sheet (the shaded parallelogram). v3 is dependent exactly when its tip lies in that sheet. Slide k until the tip sits on the sheet.";
  Q["1.2"] = function (box, p) {
    var v1 = p.v1, v2 = p.v2, a = p.v3[0], b = p.v3[1], n = V.cross(v1, v2), ks = n[2] ? -(a * n[0] + b * n[1]) / n[2] : 0, K0 = Math.max(6, Math.ceil(Math.abs(ks)) + 4), k = 0, out = V.note(box);
    var pts = [v1, v2, [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]], [a, b, 0], [0, 0, Math.hypot(a, b, v1[0], v1[1], v1[2]) * 0.6]], vw = V.view3(box, pts, function (pr, P) {
      var K = V.col(), s = pr([0, 0, 0]), A1 = pr(v1), A2 = pr(v2), A12 = pr([v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]]);
      P.poly([s, A1, A12, A2], K.mute, K.line, 1); P.arrow(s[0], s[1], A1[0], A1[1], K.a, 2.5); P.arrow(s[0], s[1], A2[0], A2[1], K.b, 2.5);
      var t = pr([a, b, k]), dep = Math.abs(V.dot([a, b, k], n)) < 1e-6 * (1 + Math.hypot.apply(null, n)); P.arrow(s[0], s[1], t[0], t[1], dep ? K.ok : K.d, 3);
      P.text(A1[0], A1[1], "v1", K.a, "left", 5, -5); P.text(A2[0], A2[1], "v2", K.b, "left", 5, -5); P.text(t[0], t[1], "v3", K.d, "left", 5, -5);
    }, "three vectors in space");
    function note() { var d = V.dot([a, b, k], n); out.textContent = "k = " + f2(k) + ".  det[v1 v2 v3] = " + f2(d) + (Math.abs(d) < 1e-6 * (1 + Math.hypot.apply(null, n)) ? "  → v3 is in the sheet: linearly DEPENDENT." : "  → v3 sticks out of the sheet: independent."); }
    V.slider(box, "k", -K0, K0, 0.25, 0, function (v) { k = v; vw.redraw(); note(); }, function (v) { return f2(v); }); note();
  };
  CAP["1.3"] = "Row-reduce step by step. Rows that turn into zero rows were dependent on the others. Rank = the number of non-zero rows left; nullity = columns − rank.";
  Q["1.3"] = function (box, p) {
    var M = p.M.map(function (r) { return r.slice(); }), steps = [{ m: M.map(function (r) { return r.slice(); }), s: "Start with M." }], row = 0, c, r, i, rows = M.length, cols = M[0].length, A = M.map(function (r) { return r.slice(); });
    for (c = 0; c < cols && row < rows; c++) {
      var piv = -1; for (r = row; r < rows; r++) if (Math.abs(A[r][c]) > 1e-9) { piv = r; break; }
      if (piv < 0) continue;
      if (piv !== row) { var tmp = A[piv]; A[piv] = A[row]; A[row] = tmp; steps.push({ m: A.map(function (q) { return q.slice(); }), s: "Swap rows " + (row + 1) + " and " + (piv + 1) + " to get a pivot in column " + (c + 1) + "." }); }
      for (r = row + 1; r < rows; r++) if (Math.abs(A[r][c]) > 1e-9) { var fct = A[r][c] / A[row][c]; for (i = 0; i < cols; i++) A[r][i] -= fct * A[row][i]; steps.push({ m: A.map(function (q) { return q.slice(); }), s: "R" + (r + 1) + " ← R" + (r + 1) + " − (" + f2(fct) + ")·R" + (row + 1) + "." }); }
      row++;
    }
    var rank = row; steps.push({ m: A.map(function (q) { return q.slice(); }), s: "Done. The non-zero rows are the pivots: rank = " + rank + ", nullity = " + cols + " − " + rank + " = " + (cols - rank) + ".", fin: true });
    var tbl = el("div", "vtable"), msg = V.note(box), idx = 0, row2 = el("div", "vrow");
    function draw() {
      var s = steps[idx], K = V.col(); tbl.innerHTML = ""; var t = el("table");
      s.m.forEach(function (rw) { var tr = el("tr"), zero = rw.every(function (x) { return Math.abs(x) < 1e-9; }); rw.forEach(function (x) { var td = el("td", null, f2(x)); if (zero) td.style.color = K.mute; tr.appendChild(td); }); if (zero && idx > 0) tr.appendChild(el("td", null, "← zero row")); t.appendChild(tr); });
      tbl.appendChild(t); msg.textContent = s.s;
    }
    var nb = el("button", "ghost", "Next step"), rb = el("button", "ghost", "Start again");
    nb.addEventListener("click", function () { if (idx < steps.length - 1) idx++; draw(); }); rb.addEventListener("click", function () { idx = 0; draw(); });
    row2.appendChild(nb); row2.appendChild(rb); box.appendChild(tbl); box.appendChild(row2); box.appendChild(msg); draw();
  };
  CAP["1.4"] = "A basis lets you reach every point by walking along v1, then v2, then v3. The coordinates x, y, z are how far you walk along each. Turn the view to see the three steps.";
  Q["1.4"] = function (box, p, st) {
    var Vv = p.V, w = p.w, note = V.note(box), sol = null;
    var M = [[Vv[0][0], Vv[1][0], Vv[2][0]], [Vv[0][1], Vv[1][1], Vv[2][1]], [Vv[0][2], Vv[1][2], Vv[2][2]]], D = V.det3(M);
    function cram(k) { var Mk = M.map(function (r, i) { var q = r.slice(); q[k] = w[i]; return q; }); return V.det3(Mk) / D; }
    sol = [cram(0), cram(1), cram(2)]; var show = !!st.solved;
    var vw = V.view3(box, [Vv[0], Vv[1], Vv[2], w], function (pr, P) {
      var K = V.col(), o = pr([0, 0, 0]), cols = [K.a, K.b, K.d], names = ["v1", "v2", "v3"];
      Vv.forEach(function (v, i) { var t = pr(v); P.arrow(o[0], o[1], t[0], t[1], cols[i], 2); P.text(t[0], t[1], names[i], cols[i], "left", 5, -5); });
      var tw = pr(w); P.dot(tw[0], tw[1], K.ink, 6); P.text(tw[0], tw[1], "w", K.ink, "left", 7, -7);
      if (show) { var cur = [0, 0, 0]; Vv.forEach(function (v, i) { var nx = [cur[0] + sol[i] * v[0], cur[1] + sol[i] * v[1], cur[2] + sol[i] * v[2]], a = pr(cur), b = pr(nx); P.seg(a[0], a[1], b[0], b[1], cols[i], 4, [6, 3]); cur = nx; }); }
    }, "basis vectors and w");
    box.__reveal = function () { show = true; vw.redraw(); note.textContent = "The dashed path walks x = " + f2(sol[0]) + " along v1, y = " + f2(sol[1]) + " along v2, z = " + f2(sol[2]) + " along v3 and ends exactly at w."; };
    if (st.solved) box.__reveal();
  };
  CAP["1.5"] = "The eigenvalues are the numbers λ where the curve det(λI − A) cuts the λ-axis. Compare with what you get from c1, c2, c3.";
  Q["1.5"] = function (box, p) { charPlot(box, V.charpoly3(p.A)); };

  /* ================= Task 2 ================= */
  CAP["2.1"] = "An eigenvector is a direction that A does not turn. Rotate v: when Av lines up with v you have found one, and the ratio of lengths is its eigenvalue.";
  Q["2.1"] = function (box, p) { eigenExplorer(box, p.A, false); };
  CAP["2.2"] = "The three eigenvalues are where the graph of det(λI − A) crosses the λ-axis. The number of crossings tells you how many real eigenvalues there are.";
  Q["2.2"] = function (box, p) { charPlot(box, V.charpoly3(p.A)); };
  CAP["2.3"] = "A turns the unit square (blue) into a parallelogram (orange). Its area is |det A|. A⁻¹ (green) turns the parallelogram back into the square. Cayley–Hamilton gives A⁻¹ without inverting.";
  Q["2.3"] = function (box, p, st) {
    var A = p.A, d = V.det2(A), P = Plot(box, { label: "unit square, its image under A and under A inverse" }), K = V.col(), note = V.note(box);
    var inv = d ? [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]] : null, sq = [[0, 0], [1, 0], [1, 1], [0, 1]], im = sq.map(function (q) { return V.mulv(A, q); }), iv = inv ? im.map(function (q) { return V.mulv(inv, q); }) : sq;
    var all = sq.concat(im); var r = V.range(all.map(function (q) { return q[0]; })), s = V.range(all.map(function (q) { return q[1]; }));
    P.range(Math.min(r[0], -0.2) - 0.3, Math.max(r[1], 1.2) + 0.3, Math.min(s[0], -0.2) - 0.3, Math.max(s[1], 1.2) + 0.3, true); P.clear(); P.axes();
    P.poly(im, K.a, "rgba(180,68,43,.12)", 2); P.poly(sq, K.b, "rgba(31,111,139,.18)", 2); P.poly(iv, K.d, null, 2);
    note.textContent = "Area of the orange parallelogram = |det A| = " + f2(Math.abs(d)) + ". If det A were 0 the square would be flattened and A⁻¹ would not exist.";
    box.__reveal = function () { var tr = A[0][0] + A[1][1], A2 = [[A[0][0] * A[0][0] + A[0][1] * A[1][0], A[0][0] * A[0][1] + A[0][1] * A[1][1]], [A[1][0] * A[0][0] + A[1][1] * A[1][0], A[1][0] * A[0][1] + A[1][1] * A[1][1]]]; note.textContent += "  Check: A² − (" + tr + ")A + (" + d + ")I = [[" + f2(A2[0][0] - tr * A[0][0] + d) + ", " + f2(A2[0][1] - tr * A[0][1]) + "], [" + f2(A2[1][0] - tr * A[1][0]) + ", " + f2(A2[1][1] - tr * A[1][1] + d) + "]], the zero matrix."; };
    if (st.solved) box.__reveal();
  };
  CAP["2.4"] = "Apply A again and again to a starting direction. The direction swings towards the eigenvector with the largest |eigenvalue|, which is why A^n = P D^n P⁻¹ is dominated by the big eigenvalue.";
  Q["2.4"] = function (box, p) {
    var A = p.A, E = V.eig2(A), P = Plot(box, { label: "directions of A^k v" }), K, out = V.note(box), k = 0, v0 = [1, 0.35];
    P.range(-1.3, 1.3, -1.3, 1.3, true);
    function draw() {
      K = V.col(); P.clear(); P.axes({ nogrid: true }); P.circle(0, 0, 1, K.line, 1.2);
      if (E.real) [E.v1, E.v2].forEach(function (u) { P.line(0, 0, u[0], u[1], K.line, 1.2, [2, 4]); });
      var v = v0.slice(), i, n; for (i = 0; i <= k; i++) { n = Math.hypot(v[0], v[1]); var u = [v[0] / n, v[1] / n]; if (i < k) P.dot(u[0], u[1], K.mute, 3); else { P.arrow(0, 0, u[0], u[1], K.a, 3); P.dot(u[0], u[1], K.a, 5); } v = V.mulv(A, v); }
      out.textContent = "k = " + k + ". The arrow is the direction of A^" + k + "·v (length scaled to 1). Dotted lines: the eigenvector directions." + (E.real ? " Eigenvalues: " + f2(E.l1) + " and " + f2(E.l2) + "." : "");
    }
    V.slider(box, "number of times A is applied (k)", 0, 8, 1, 0, function (x) { k = x; draw(); }); draw();
  };
  CAP["2.5"] = "A symmetric matrix turns the unit circle into an ellipse whose two axes are perpendicular, and those axes are the eigenvector directions. Rotate v to find them.";
  Q["2.5"] = function (box, p) { eigenExplorer(box, [[p.a, p.b], [p.b, p.c]], true); };
  CAP["2.6"] = "An orthogonal matrix is a pure rotation (or reflection): it turns the square without stretching it. Lengths and angles stay the same; Qv has the same length as v.";
  Q["2.6"] = function (box, p, st) {
    var c = p.c, s = p.s, Qm = [[c, -s], [s, c]], v = [p.x, p.y], nv = Math.hypot(v[0], v[1]) || 1, u = [v[0] / nv, v[1] / nv], w = V.mulv(Qm, u), P = Plot(box, { label: "a vector and its image under an orthogonal matrix" }), K = V.col(), note = V.note(box);
    P.range(-1.4, 1.4, -1.4, 1.4, true); P.clear(); P.axes({ nogrid: true }); P.circle(0, 0, 1, K.line, 1.2);
    var sq = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]; P.poly(sq, K.b, "rgba(31,111,139,.15)", 1.5); P.poly(sq.map(function (q) { return V.mulv(Qm, q); }), K.a, "rgba(180,68,43,.15)", 1.5);
    P.arrow(0, 0, u[0], u[1], K.b, 3); P.arrow(0, 0, w[0], w[1], K.a, 3); P.text(u[0], u[1], "v", K.b, "left", 6, -6); P.text(w[0], w[1], "Qv", K.a, "left", 6, -6);
    var ang = (Math.atan2(w[1], w[0]) - Math.atan2(u[1], u[0])) * 180 / PI; ang = ((ang + 540) % 360) - 180;
    note.textContent = "Both arrows have the same length (drawn as 1). The vector is turned by " + f2(ang) + "°. Check: Qᵀ Q = I, det Q = " + f2(V.det2(Qm)) + ".";
  };

  /* ================= Task 3 ================= */
  CAP["3.1"] = "Every little dash is the slope the equation demands at that point. A solution is a curve that follows the dashes. The initial value y(1) picks one curve from the whole family.";
  Q["3.1"] = function (box, p, st) {
    var k = p.k, m = p.m, y0 = p.y0, C = y0 - 1 / (m + 1 + k), sol = function (x) { return Math.pow(x, m + 1) / (m + 1 + k) + C * Math.pow(x, -k); };
    var ys = []; for (var i = 0; i <= 60; i++) ys.push(sol(0.5 + 2.7 * i / 60)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.2 + 0.5, P = Plot(box, { label: "slope field and solution curve" }), K = V.col();
    P.range(0.5, 3.2, r[0] - pad, r[1] + pad); P.clear(); P.axes(); P.slopes(function (x, y) { return Math.pow(x, m) - k / x * y; }, 16, 12, K.line, 14); P.fn(sol, 0.5, 3.2, K.b, 3);
    P.dot(1, y0, K.a, 5); P.text(1, y0, "(1, y(1))", K.a, "left", 7, -10); P.ring(2, sol(2), K.d, 6);
    box.__reveal = function () { P.text(2, sol(2), "y(2) = " + f2(sol(2)), K.d, "left", 9, -10); };
    if (st.solved) box.__reveal();
  };
  CAP["3.2"] = "Slopes dy/dx = a x²/y. Because y² is built from x³ the solution is a smooth arc. Separating variables turns the picture into one integral.";
  Q["3.2"] = function (box, p, st) {
    var a = p.a, y0 = p.y0, x0 = p.x0, sol = function (x) { return Math.sqrt(y0 * y0 + 2 * a * x * x * x / 3); }, X = x0 + 1, ym = sol(X) * 1.15, P = Plot(box, { label: "slope field and solution" }), K = V.col();
    P.range(0, X, 0, ym); P.clear(); P.axes(); P.slopes(function (x, y) { return a * x * x / Math.max(y, 1e-6); }, 16, 12, K.line, 14); P.fn(sol, 0, X, K.b, 3); P.dot(0, y0, K.a, 5); P.ring(x0, sol(x0), K.d, 6);
    box.__reveal = function () { P.text(x0, sol(x0), "y² = " + f2(sol(x0) * sol(x0)), K.d, "right", -9, -10); }; if (st.solved) box.__reveal();
  };
  CAP["3.3"] = "For an exact equation the solutions are the level curves of one potential function f(x, y). Moving along a level curve keeps f constant, which is exactly what f_x dx + f_y dy = 0 says.";
  Q["3.3"] = function (box, p, st) {
    var k = p.b / (p.a - 1), f = function (x, y) { return p.p * x * x / 2 + k * x * y + p.s * y * y / 2; }, f0 = f(p.x0, p.y0), R = Math.max(p.x0, p.y0) + 2.5, P = Plot(box, { label: "level curves of the potential" }), K = V.col();
    P.range(-R, R, -R, R, true); P.clear(); P.axes(); var base = Math.abs(f0) > 1e-9 ? f0 : 1, lv = [-1.5, -1, -0.5, 0.25, 0.5, 0.75, 1.25, 1.5, 2, 3].map(function (z) { return z * base; });
    P.contour(f, lv, K.mute, 1.2); P.contour(f, [f0], K.a, 2.8); P.dot(p.x0, p.y0, K.a, 5); P.text(p.x0, p.y0, "(x0, y0)", K.a, "left", 7, -9);
    box.__reveal = function () { P.text(p.x0, p.y0, "f = " + f2(f0), K.a, "left", 7, 10); }; if (st.solved) box.__reveal();
  };
  CAP["3.4"] = "The solution is a mix of two exponentials (dashed). Positive r grows, negative r dies away. The solid curve starts at y(0) with the slope y'(0) you were given.";
  Q["3.4"] = function (box, p) {
    var c2 = (p.B - p.r1 * p.A) / (p.r2 - p.r1), c1 = p.A - c2, sol = function (x) { return c1 * Math.exp(p.r1 * x) + c2 * Math.exp(p.r2 * x); }, a = -1.2, b = 1.2, ys = [], i;
    for (i = 0; i <= 80; i++) ys.push(sol(a + (b - a) * i / 80)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.2 + 1, P = Plot(box, { label: "solution curve and its two exponentials" }), K = V.col();
    P.range(a, b, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "x" });
    P.fn(function (x) { return c1 * Math.exp(p.r1 * x); }, a, b, K.b, 1.5, [5, 3]); P.fn(function (x) { return c2 * Math.exp(p.r2 * x); }, a, b, K.d, 1.5, [5, 3]); P.fn(sol, a, b, K.a, 3);
    P.dot(0, p.A, K.ink, 5); P.line(0, p.A, 1, p.B, K.ink, 1.2, [2, 3]);
  };
  CAP["3.5"] = "Try y_p = A e^{kx} in the left side. Slide A until the blue curve (left side with your trial) lies on top of the orange curve (the right side). That A is the particular integral.";
  Q["3.5"] = function (box, p) {
    var den = p.k * p.k + p.a * p.k + p.b, P = Plot(box, { label: "left side with trial A against right side" }), K = V.col(), out = V.note(box), A = 0, a = -1, b = 1.5;
    var rhs = function (x) { return p.c * Math.exp(p.k * x); }, ys = []; for (var i = 0; i <= 60; i++) ys.push(rhs(a + (b - a) * i / 60)); var r = V.range(ys), rg = Math.max(Math.abs(r[0]), Math.abs(r[1])) * 1.3 + 1; P.range(a, b, -rg, rg);
    function draw() { K = V.col(); P.clear(); P.axes({ xl: "x" }); P.fn(rhs, a, b, K.a, 3); P.fn(function (x) { return A * den * Math.exp(p.k * x); }, a, b, K.b, 2.5, [6, 3]); var gap = A * den - p.c; out.textContent = "A = " + f2(A) + ". Left side minus right side at x = 0 is " + f2(gap) + (Math.abs(gap) < 0.05 * Math.max(1, Math.abs(p.c)) ? " → the curves coincide: this A works." : "."); }
    V.slider(box, "trial value of A", -8, 8, 0.02, 0, function (x) { A = x; draw(); }, function (x) { return f2(x); }); draw();
  };
  CAP["3.6"] = "Try y_p = Ax + B. The left side then becomes another straight line. Slide A and B until it lies on the orange line (the right side): matching slope gives A, matching intercept gives B.";
  Q["3.6"] = function (box, p) {
    var P = Plot(box, { label: "left side with trial A, B against the right side" }), K, out = V.note(box), A = 0, B = 0, lhs = function (x) { return p.a * A + p.b * (A * x + B); }, rhs = function (x) { return p.c * x + p.d; };
    var rg = 3 * (Math.abs(p.c) + Math.abs(p.d)) + 5; P.range(-3, 3, -rg, rg);
    function draw() { K = V.col(); P.clear(); P.axes({ xl: "x" }); P.fn(rhs, -3, 3, K.a, 3); P.fn(lhs, -3, 3, K.b, 2.5, [6, 3]); var d0 = lhs(0) - rhs(0), d1 = lhs(1) - rhs(1); out.textContent = "A = " + f2(A) + ", B = " + f2(B) + ". Gap at x = 0: " + f2(d0) + ", gap at x = 1: " + f2(d1) + (Math.abs(d0) < 0.15 && Math.abs(d1) < 0.15 ? " → the lines coincide." : "."); }
    V.slider(box, "trial A", -8, 8, 0.02, 0, function (x) { A = x; draw(); }, function (x) { return f2(x); });
    V.slider(box, "trial B", -15, 15, 0.02, 0, function (x) { B = x; draw(); }, function (x) { return f2(x); }); draw();
  };

  /* ================= Task 4 ================= */
  CAP["4.1"] = "Solutions are powers of x. With x > 0 each power m gives one curve; the answer is a mix of the two. The substitution x = e^t turns the equation into one with constant coefficients.";
  Q["4.1"] = function (box, p) {
    var b1 = 1 - p.a, disc = b1 * b1 - 4 * p.b, s = Math.sqrt(Math.max(disc, 0)), m1 = (b1 - s) / 2, m2 = (b1 + s) / 2, C2 = (p.B - m1 * p.A) / (m2 - m1), C1 = p.A - C2;
    var sol = function (x) { return C1 * Math.pow(x, m1) + C2 * Math.pow(x, m2); }, ys = []; for (var i = 0; i <= 60; i++) ys.push(sol(0.5 + 2.5 * i / 60)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.2 + 1;
    var P = Plot(box, { label: "Cauchy-Euler solution" }), K = V.col(); P.range(0.25, 3, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "x" });
    P.fn(function (x) { return C1 * Math.pow(x, m1); }, 0.25, 3, K.b, 1.5, [5, 3]); P.fn(function (x) { return C2 * Math.pow(x, m2); }, 0.25, 3, K.d, 1.5, [5, 3]); P.fn(sol, 0.25, 3, K.a, 3); P.dot(1, p.A, K.ink, 5); P.line(1, p.A, 1, p.B, K.ink, 1.2, [2, 3]);
  };
  CAP["4.2"] = "Legendre polynomials wiggle between −1 and 1 and P_n crosses zero n times. The height of the bold curve at your x is the value you are asked for.";
  Q["4.2"] = function (box, p, st) {
    var P = Plot(box, { label: "Legendre polynomials" }), K = V.col(), n, ys = []; P.range(-1, 1, -1.2, 1.2); P.clear(); P.axes({ xl: "x" });
    for (n = 0; n < p.n; n++) P.fn(function (x) { return V.legendre(n, x); }, -1, 1, K.line, 1.5);
    var nn = p.n; P.fn(function (x) { return V.legendre(nn, x); }, -1, 1, K.b, 3, null, 300); P.seg(p.x0, 0, p.x0, V.legendre(nn, p.x0), K.a, 1.5, [4, 3]); P.dot(p.x0, V.legendre(nn, p.x0), K.a, 5);
    V.roots(function (x) { return V.legendre(nn, x); }, -1, 1).forEach(function (r) { P.ring(r, 0, K.d, 4); });
    box.__reveal = function () { P.text(p.x0, V.legendre(nn, p.x0), "P" + nn + " = " + f3(V.legendre(nn, p.x0)), K.a, "left", 8, -10); }; if (st.solved) box.__reveal();
  };
  CAP["4.3"] = "A power series is built term by term. Each extra term bends the curve closer to the true solution. Slide the number of terms and watch the curves settle down.";
  Q["4.3"] = function (box, p, st) {
    var a = [p.a0, p.a1], i; for (i = 0; i < 16; i++) a.push((i * (i + 1) - p.lam) / ((i + 2) * (i + 1)) * a[i]);
    var P = Plot(box, { label: "partial sums of the series solution" }), K, out = V.note(box), N = 2, ev = function (n, x) { var s = 0, j; for (j = 0; j <= n; j++) s += a[j] * Math.pow(x, j); return s; };
    var ys = []; for (i = 0; i <= 40; i++) ys.push(ev(14, -0.9 + 1.8 * i / 40)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.25 + 0.5; P.range(-0.95, 0.95, Math.max(r[0] - pad, -50), Math.min(r[1] + pad, 50));
    function draw() { K = V.col(); P.clear(); P.axes({ xl: "x" }); P.fn(function (x) { return ev(14, x); }, -0.95, 0.95, K.line, 3); P.fn(function (x) { return ev(N, x); }, -0.95, 0.95, K.b, 2.5, [5, 3]); out.textContent = "Partial sum up to x^" + N + " (dashed) against the sum up to x^14 (grey, practically the full solution)."; }
    V.slider(box, "highest power used", 1, 14, 1, 2, function (x) { N = x; draw(); }); draw();
    box.__reveal = function () { out.textContent += "  Your coefficients: a2 = " + f3(a[2]) + ", a3 = " + f3(a[3]) + ", a4 = " + f3(a[4]) + "."; }; if (st.solved) box.__reveal();
  };
  CAP["4.4"] = "The Wronskian W measures how independent y1 and y2 are; it never vanishes, so the divisions in u1' and u2' are safe. The vertical line is x = 0, where your answers are read.";
  Q["4.4"] = function (box, p) {
    var d = p.r2 - p.r1, W = function (x) { return d * Math.exp((p.r1 + p.r2) * x); }, g = function (x) { return p.c * Math.exp(p.k * x); }, u1 = function (x) { return -Math.exp(p.r2 * x) * g(x) / W(x); }, u2 = function (x) { return Math.exp(p.r1 * x) * g(x) / W(x); };
    var ys = []; for (var i = 0; i <= 60; i++) { var x = -1 + 2 * i / 60; ys.push(W(x), u1(x), u2(x)); } var r = V.range(ys), cap = 12 * (Math.abs(d) + p.c); r[0] = Math.max(r[0], -cap); r[1] = Math.min(r[1], cap); var pad = (r[1] - r[0]) * 0.15 + 0.5;
    var P = Plot(box, { label: "Wronskian and the two u-primes" }), K = V.col(); P.range(-1, 1, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "x" });
    P.fn(W, -1, 1, K.ink, 2.5); P.fn(u1, -1, 1, K.b, 2.5); P.fn(u2, -1, 1, K.a, 2.5); P.seg(0, P.y0, 0, P.y1, K.mute, 1, [3, 3]);
    P.text(P.x1, W(1), "W", K.ink, "right", -4, -8); P.text(P.x1, u1(1), "u1'", K.b, "right", -4, -8); P.text(P.x1, u2(1), "u2'", K.a, "right", -4, 8);
  };
  CAP["4.5"] = "When the right side matches a root of the auxiliary equation, plain e^{rx} cannot work: it is already a solution of the left side. The extra factor x (or x²) is what makes the particular integral grow.";
  Q["4.5"] = function (box, p) {
    var A = p.c / (p.r1 - p.r2), B = p.c2 / 2, K = V.col();
    function one(title, hom, forcing, yp, lim) {
      var P = Plot(box, { h: 190, label: title }), ys = [], i; for (i = 0; i <= 50; i++) { var x = 2.2 * i / 50; ys.push(hom(x), forcing(x), yp(x)); } var r = V.range(ys), pad = (r[1] - r[0]) * 0.15 + 0.5; P.range(0, 2.2, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "x" });
      P.fn(hom, 0, 2.2, K.mute, 1.5, [5, 3]); P.fn(forcing, 0, 2.2, K.a, 2.5); P.fn(yp, 0, 2.2, K.b, 2.5); box.appendChild(el("div", "small", title));
    }
    one("(a) orange: the right side · dashed: e^{rx}, a solution of the left side's homogeneous part · blue: y_p = A x e^{rx}", function (x) { return Math.exp(p.r1 * x); }, function (x) { return p.c * Math.exp(p.r1 * x); }, function (x) { return A * x * Math.exp(p.r1 * x); });
    one("(b) same idea for a double root: blue y_p = B x² e^{rx}", function (x) { return Math.exp(p.rr * x); }, function (x) { return p.c2 * Math.exp(p.rr * x); }, function (x) { return B * x * x * Math.exp(p.rr * x); });
  };

  /* ================= Task 5 ================= */
  var pt = function (name) { return name; };
  CAP["5.1"] = "Slide along the parabola. Near the vertex the curve bends sharply (small circle, big curvature); far out it straightens (huge circle). The centre of the dashed circle is the centre of curvature (α, β).";
  Q["5.1"] = function (box, p) { var x0 = 2 * p.a * p.m, R = Math.abs(x0) * 1.3 + 4 * p.a; osc(box, function (t) { return t; }, function (t) { return t * t / (4 * p.a); }, -R, R, x0); };
  CAP["5.2"] = "On an ellipse the curvature is largest at the ends of the long axis (smallest circle) and smallest at the ends of the short axis. Slide θ and watch the circle breathe.";
  Q["5.2"] = function (box, p) { osc(box, function (t) { return p.A * Math.cos(t); }, function (t) { return p.B * Math.sin(t); }, 0, 2 * PI, ((Math.atan2(p.s, p.c) % (2 * PI)) + 2 * PI) % (2 * PI), { label: "θ" }); };
  CAP["5.3"] = "On the equiangular spiral the circle of curvature grows in proportion to r: all spirals of this kind are copies of each other, so ρ/r stays constant.";
  Q["5.3"] = function (box, p) { osc(box, function (t) { return p.r0 * Math.exp(p.b * t) * Math.cos(t); }, function (t) { return p.r0 * Math.exp(p.b * t) * Math.sin(t); }, -4, 1.8, 0, { label: "θ (r = 50 at θ = 0 for the question)" }); };
  CAP["5.4"] = "A cardioid has a cusp at θ = π (curvature infinite, circle shrinks to a point) and is gentlest at the far side. Check ρ against r: ρ is two-thirds of the length 2·√(2ar).";
  Q["5.4"] = function (box, p) { osc(box, function (t) { return p.a * (1 + Math.cos(t)) * Math.cos(t); }, function (t) { return p.a * (1 + Math.cos(t)) * Math.sin(t); }, -3.05, 3.05, 2 * Math.acos(p.c), { label: "θ" }); };
  CAP["5.5"] = "At the top of the arch the cycloid is gentlest (ρ = 4a) and at the cusp on the ground ρ shrinks to 0. The centre of curvature always lies below the curve: a cycloid's evolute is another cycloid.";
  Q["5.5"] = function (box, p) { osc(box, function (t) { return p.a * (t - Math.sin(t)); }, function (t) { return p.a * (1 - Math.cos(t)); }, -2 * PI + 0.05, 2 * PI - 0.05, 2 * Math.asin(p.s0), { label: "t" }); };
  CAP["5.6"] = "Same parabola, now with a linear term, so the vertex is shifted. The sharpest bend is always at the vertex x = −b/(2a).";
  Q["5.6"] = function (box, p) { var v = -p.b / (2 * p.a), lo = Math.min(p.x0, v) - 3, hi = Math.max(p.x0, v) + 3; osc(box, function (t) { return t; }, function (t) { return p.a * t * t + p.b * t; }, lo, hi, p.x0, { label: "x" }); };

  /* ================= Task 6 ================= */
  function ellEvolute(box, A, B, th0, arc) {
    var P = Plot(box, { label: "ellipse and its evolute" }), K = V.col(), out = V.note(box), d = A * A - B * B, ex = function (t) { return d * Math.pow(Math.cos(t), 3) / A; }, ey = function (t) { return -d * Math.pow(Math.sin(t), 3) / B; }, th = th0;
    var bx = Math.max(A, Math.abs(d) / A) * 1.15, by = Math.max(B, Math.abs(d) / B) * 1.15; P.range(-bx, bx, -by, by, true);
    function draw() {
      K = V.col(); P.clear(); P.axes(); P.param(function (t) { return A * Math.cos(t); }, function (t) { return B * Math.sin(t); }, 0, 2 * PI, K.b, 2.5); P.param(ex, ey, 0, 2 * PI, K.a, 2);
      if (arc) { P.param(ex, ey, 0, PI / 2, K.a, 5); P.dot(ex(0), ey(0), K.ink, 5); P.dot(ex(PI / 2), ey(PI / 2), K.ink, 5); out.textContent = "The thick part of the evolute joins the centres of curvature at θ = 0 and θ = π/2. A string wound along the evolute and unwound draws the ellipse (that is an involute)."; return; }
      var x = A * Math.cos(th), y = B * Math.sin(th); P.seg(x, y, ex(th), ey(th), K.ink, 1.5, [5, 3]); P.dot(x, y, K.ink, 5); P.dot(ex(th), ey(th), K.a, 5);
      out.textContent = "Centre of curvature (α, β) = (" + f2(ex(th)) + ", " + f2(ey(th)) + "). The dashed normal is tangent to the evolute: the evolute is the envelope of the normals.";
    }
    if (!arc) V.slider(box, "θ", 0, 2 * PI, 0.01, th, function (v) { th = v; draw(); }, function (v) { return f2(v); }); draw();
  }
  CAP["6.1"] = "The evolute (orange) is the path of the centre of curvature. Slide θ: the dashed normal from the ellipse touches the evolute at the centre of curvature.";
  Q["6.1"] = function (box, p) { ellEvolute(box, p.A, p.B, ((Math.atan2(p.s, p.c) % (2 * PI)) + 2 * PI) % (2 * PI), false); };
  CAP["6.2"] = "Evolute and involute are partners. A taut string unwinding off the evolute draws the ellipse. The length of evolute between two points equals the difference of the radii of curvature there.";
  Q["6.2"] = function (box, p, st) { ellEvolute(box, p.A, p.B, 0, true); var n = V.note(box); box.__reveal = function () { n.textContent = "Arc length = ρ(π/2) − ρ(0) = " + f2(p.A * p.A / p.B) + " − " + f2(p.B * p.B / p.A) + " = " + f2(p.A * p.A / p.B - p.B * p.B / p.A) + "."; }; if (st.solved) box.__reveal(); };
  CAP["6.3"] = "Each line x/a + y/b = 1 is a member of the family. Together the lines trace a curve that none of them crosses: the envelope. Slide a to see each line touch it at one point.";
  Q["6.3"] = function (box, p) {
    var S = p.S, P = Plot(box, { label: "family of lines and the envelope" }), K, out = V.note(box), a = p.a; P.range(0, S * 1.05, 0, S * 1.05, true);
    function draw() {
      K = V.col(); P.clear(); P.axes(); var i; for (i = 1; i < 28; i++) { var aa = S * i / 28; P.seg(aa, 0, 0, S - aa, K.line, 1); }
      P.fn(function (x) { var r = Math.sqrt(S) - Math.sqrt(x); return r * r; }, 0, S, K.b, 3); P.seg(a, 0, 0, S - a, K.a, 2.5); var b = S - a, tx = a * a / S, ty = b * b / S; P.dot(tx, ty, K.ink, 5);
      out.textContent = "Line with a = " + f2(a) + ", b = " + f2(b) + " touches the envelope at (" + f2(tx) + ", " + f2(ty) + ").";
    }
    V.slider(box, "a", 1, S - 1, 0.5, a, function (v) { a = v; draw(); }, function (v) { return f2(v); }); draw();
  };
  CAP["6.4"] = "Lines y = mx + c/m for many slopes m wrap around a parabola. The point of contact is where neighbouring lines (m and m + dm) cross, which is how the envelope is found.";
  Q["6.4"] = function (box, p) {
    var c = p.c, u = Math.max(Math.abs(c), 1), P = Plot(box, { label: "family of tangent lines and the parabola" }), K, out = V.note(box), m = p.m; P.range(-2 * u, 6 * u, -5 * u, 5 * u, true);
    function draw() {
      K = V.col(); P.clear(); P.axes(); var i, mm; for (i = -12; i <= 12; i++) { mm = i * 0.4 || 0.2; P.line(0, c / mm, 1, mm, K.line, 1); }
      P.param(function (t) { return c * t * t; }, function (t) { return 2 * c * t; }, -4, 4, K.b, 3); P.line(0, c / m, 1, m, K.a, 2.5); P.dot(c / (m * m), 2 * c / m, K.ink, 5);
      out.textContent = "m = " + f2(m) + ": the line touches the parabola at (" + f2(c / (m * m)) + ", " + f2(2 * c / m) + ").";
    }
    V.slider(box, "slope m", -5, 5, 0.1, m, function (v) { m = Math.abs(v) < 0.05 ? 0.1 : v; draw(); }, function (v) { return f2(v); }); draw();
  };
  function pedal(box, ptf, t0, t1, tinit, title) {
    var P = Plot(box, { label: title }), K, out = V.note(box), cur = tinit, pts = [], i, bb = [Infinity, -Infinity, Infinity, -Infinity];
    for (i = 0; i <= 300; i++) { var q = ptf(t0 + (t1 - t0) * i / 300); pts.push(q); bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.max(bb[1], q[0]); bb[2] = Math.min(bb[2], q[1]); bb[3] = Math.max(bb[3], q[1]); }
    var ex = (bb[1] - bb[0]) * 0.15 + 1, ey = (bb[3] - bb[2]) * 0.15 + 1; P.range(Math.min(bb[0] - ex, -ex), Math.max(bb[1] + ex, ex), Math.min(bb[2] - ey, -ey), Math.max(bb[3] + ey, ey), true);
    function draw() {
      K = V.col(); P.clear(); P.axes(); P.path(pts, K.b, 2.5); var h = (t1 - t0) * 1e-4, q = ptf(cur), q2 = ptf(cur + h), q1 = ptf(cur - h), tx = (q2[0] - q1[0]), ty = (q2[1] - q1[1]), n = Math.hypot(tx, ty); tx /= n; ty /= n;
      var pp = q[0] * ty - q[1] * tx, fx = pp * ty, fy = -pp * tx; P.line(q[0], q[1], tx, ty, K.mute, 1.5, [5, 3]); P.seg(0, 0, fx, fy, K.a, 2.5); P.seg(0, 0, q[0], q[1], K.ink, 1.5); P.dot(0, 0, K.ink, 4); P.dot(q[0], q[1], K.ink, 5);
      out.textContent = "r = " + f2(Math.hypot(q[0], q[1])) + ", p = " + f2(Math.abs(pp)) + " (the orange length from the pole to the tangent), p² = " + f2(pp * pp) + ".";
    }
    V.slider(box, "position", t0, t1, (t1 - t0) / 300, cur, function (v) { cur = v; draw(); }, function (v) { return f2(v); }); draw();
  }
  CAP["6.5"] = "p is the perpendicular distance from the pole to the tangent. The pedal equation relates p to r; it describes the shape without any angle. Slide the point and watch p change with r.";
  Q["6.5"] = function (box, p) {
    var a = p.a; box.appendChild(el("div", "small", "(a) cardioid r = a(1 + cos θ), pole at the origin"));
    pedal(box, function (t) { var r = a * (1 + Math.cos(t)); return [r * Math.cos(t), r * Math.sin(t)]; }, -3.0, 3.0, Math.acos(p.r1 / a - 1), "cardioid and its tangent");
    box.appendChild(el("div", "small", "(b) parabola y² = 16x, pole at the focus (4, 0)"));
    pedal(box, function (t) { return [t * t / 16 - 4, t]; }, -14, 14, Math.sqrt(16 * (p.r2 - 4)), "parabola and its tangent");
  };
  CAP["6.6"] = "Tracing a curve means finding where it meets the axes, its symmetry, its range and its special points. Here the curve crosses itself at the origin (a node) and the two dashed lines are the tangents there.";
  Q["6.6"] = function (box, p) {
    var c = p.c, cc = c * c, s = p.sign, P = Plot(box, { label: "traced curve with a node" }), K = V.col(), yy = function (x) { var r = cc + s * x; return r < 0 ? NaN : Math.abs(x) * Math.sqrt(r); };
    var lo = s < 0 ? -0.4 * cc : -1.15 * cc, hi = s < 0 ? 1.15 * cc : 0.4 * cc, ym = 0.5 * Math.pow(c, 3); P.range(lo, hi, -ym, ym); P.clear(); P.axes();
    P.fn(yy, lo, hi, K.b, 2.5, null, 500); P.fn(function (x) { return -yy(x); }, lo, hi, K.b, 2.5, null, 500); P.line(0, 0, 1, c, K.a, 1.5, [5, 3]); P.line(0, 0, 1, -c, K.a, 1.5, [5, 3]);
    P.dot(0, 0, K.ink, 5); P.text(0, 0, "node", K.ink, "left", 8, -10); P.dot(-s * cc, 0, K.ink, 5);
    box.appendChild(el("div", "small", "The two axes use different scales so that the loop fits on the page."));
  };

  /* ================= Task 7 ================= */
  CAP["7.1"] = "Fix y and move along x: you get a curve whose bend is f_xx (second derivative, 2nd-order Taylor parabola dashed). Fix x and move along y: the bend is f_yy.";
  Q["7.1"] = function (box, p, st) {
    var f = function (x, y) { return p.a * x * x * x * y * y + p.b * x * y * y * y + p.c * x * x * y + p.d * y * y; };
    var fx = 3 * p.a * p.p * p.p * p.q * p.q + p.b * Math.pow(p.q, 3) + 2 * p.c * p.p * p.q, fy = 2 * p.a * Math.pow(p.p, 3) * p.q + 3 * p.b * p.p * p.q * p.q + p.c * p.p * p.p + 2 * p.d * p.q;
    var fxx = 6 * p.a * p.p * p.q * p.q + 2 * p.c * p.q, fyy = 2 * p.a * Math.pow(p.p, 3) + 6 * p.b * p.p * p.q + 2 * p.d;
    function slice(title, g, x0, d1, d2) {
      box.appendChild(el("div", "small", title)); var P = Plot(box, { h: 180, label: title }), K = V.col(), ys = [], i; for (i = 0; i <= 40; i++) ys.push(g(x0 - 1 + 2 * i / 40));
      var r = V.range(ys), pad = (r[1] - r[0]) * 0.3 + 1; P.range(x0 - 1, x0 + 1, r[0] - pad, r[1] + pad); P.clear(); P.axes({ nogrid: false });
      P.fn(g, x0 - 1, x0 + 1, K.b, 3); P.fn(function (x) { return g(x0) + d1 * (x - x0) + d2 / 2 * (x - x0) * (x - x0); }, x0 - 1, x0 + 1, K.a, 1.8, [5, 3]); P.dot(x0, g(x0), K.ink, 5);
    }
    slice("Slice y = " + p.q + ": f(x, " + p.q + "). Dashed: the parabola with the same bend, f_xx/2.", function (x) { return f(x, p.q); }, p.p, fx, fxx);
    slice("Slice x = " + p.p + ": f(" + p.p + ", y). Dashed: the parabola with the same bend, f_yy/2.", function (y) { return f(p.p, y); }, p.q, fy, fyy);
    box.__reveal = function () { };
  };
  CAP["7.2"] = "Along a ray from the origin a homogeneous function of degree n scales like t^n. The two curves lie on top of each other. Differentiating at t = 1 gives Euler's theorem: x u_x + y u_y = n·u.";
  Q["7.2"] = function (box, p) {
    var u = function (x, y) { return p.a * x * x * x + p.b * x * x * y + p.c * x * y * y + p.d * y * y * y; }, g = function (t) { return u(t * p.p, t * p.q); }, u0 = g(1), P = Plot(box, { label: "u along a ray from the origin" }), K = V.col(), ys = [], i;
    for (i = 0; i <= 40; i++) ys.push(g(2 * i / 40)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.2 + 1; P.range(0, 2, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "t" });
    P.fn(function (t) { return t * t * t * u0; }, 0, 2, K.a, 4, [6, 3]); P.fn(g, 0, 2, K.b, 2); P.dot(1, u0, K.ink, 5); var h = 1e-4, sl = (g(1 + h) - g(1 - h)) / (2 * h); P.line(1, u0, 1, sl, K.ink, 1.2, [2, 3]);
    box.appendChild(el("div", "small", "Blue: u(tx, ty). Orange dashed: t³·u(x, y). The dotted tangent at t = 1 has slope x u_x + y u_y."));
  };
  CAP["7.3"] = "The equation defines a curve (the contour F = 0). Its slope at the marked point is dy/dx = −F_x/F_y: the tangent line (dashed) is perpendicular to the gradient of F.";
  Q["7.3"] = function (box, p) {
    var F = function (x, y) { return x * x * x + y * y * y + p.a * x * y - p.b; }, Fx = 3 * p.p * p.p + p.a * p.q, Fy = 3 * p.q * p.q + p.a * p.p, R = Math.max(Math.abs(p.p), Math.abs(p.q)) + 4, P = Plot(box, { label: "implicit curve and tangent" }), K = V.col();
    P.range(p.p - R, p.p + R, p.q - R, p.q + R, true); P.clear(); P.axes(); P.contour(F, [0], K.b, 2.8); P.line(p.p, p.q, Fy, -Fx, K.a, 1.8, [6, 3]); P.arrow(p.p, p.q, p.p + Fx * R / 6 / Math.hypot(Fx, Fy), p.q + Fy * R / 6 / Math.hypot(Fx, Fy), K.d, 2); P.dot(p.p, p.q, K.ink, 5);
    box.appendChild(el("div", "small", "Green arrow: the gradient (F_x, F_y), always at right angles to the tangent."));
  };
  CAP["7.4"] = "dz/dt is the slope of z plotted against t. Shrink the step h: the slope of the chord (secant) from t0 to t0 + h settles on the slope of the tangent, which is the chain-rule answer.";
  Q["7.4"] = function (box, p) {
    var z = function (t) { return p.b * Math.pow(t, 7) + p.a * Math.pow(t, 6); }, t0 = p.t0, P = Plot(box, { label: "z against t with chord and tangent" }), K, out = V.note(box), hh = 0.8, dz = 7 * p.b * Math.pow(t0, 6) + 6 * p.a * Math.pow(t0, 5);
    var ys = []; for (var i = 0; i <= 30; i++) ys.push(z(t0 - 1 + 2 * i / 30)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.1 + 1; P.range(t0 - 1, t0 + 1, r[0] - pad, r[1] + pad);
    function draw() { K = V.col(); P.clear(); P.axes({ xl: "t" }); P.fn(z, t0 - 1, t0 + 1, K.b, 3); P.dot(t0, z(t0), K.ink, 5); P.line(t0, z(t0), 1, dz, K.mute, 1.4, [3, 3]); P.line(t0, z(t0), 1, (z(t0 + hh) - z(t0)) / hh, K.a, 2.2); P.dot(t0 + hh, z(t0 + hh), K.a, 4); out.textContent = "Chord slope with h = " + f3(hh) + ": " + f2((z(t0 + hh) - z(t0)) / hh) + ". As h → 0 this approaches dz/dt (dotted tangent)."; }
    V.slider(box, "step h", 0.01, 1, 0.01, hh, function (v) { hh = v; draw(); }, function (v) { return f2(v); }); draw();
  };
  CAP["7.5"] = "The Jacobian is the local stretch factor of the change of variables. A tiny square in the (x, y) plane becomes a small curved patch in the (u, v) plane whose area is |J| times larger.";
  Q["7.5"] = function (box, p, st) {
    var U = function (x, y) { return p.p * x * x - p.q * y; }, W = function (x, y) { return p.r * x * y + p.s * x; }, hh = 0.2, out = V.note(box), K;
    var P1 = Plot(box, { h: 190, label: "patch in the xy-plane" }), P2 = Plot(box, { h: 190, label: "its image in the uv-plane" });
    function area(pts) { var s = 0, i; for (i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
    function draw() {
      K = V.col(); var x0 = p.x0, y0 = p.y0, g = [], i, j, n = 6, e = []; P1.range(x0 - 0.3, x0 + 0.5, y0 - 0.3, y0 + 0.5, true); P1.clear(); P1.axes();
      var cnt = [[x0, y0], [x0 + hh, y0], [x0 + hh, y0 + hh], [x0, y0 + hh]]; P1.poly(cnt, K.b, "rgba(31,111,139,.2)", 2);
      for (i = 0; i <= n; i++) { var s = i / n; P1.seg(x0 + hh * s, y0, x0 + hh * s, y0 + hh, K.b, 0.8); P1.seg(x0, y0 + hh * s, x0 + hh, y0 + hh * s, K.b, 0.8); }
      var img = function (a, b) { return [U(a, b), W(a, b)]; }, ring = [], t; for (t = 0; t < 40; t++) ring.push(img(x0 + hh * t / 40, y0)); for (t = 0; t < 40; t++) ring.push(img(x0 + hh, y0 + hh * t / 40)); for (t = 0; t < 40; t++) ring.push(img(x0 + hh * (1 - t / 40), y0 + hh)); for (t = 0; t < 40; t++) ring.push(img(x0, y0 + hh * (1 - t / 40)));
      var rx = V.range(ring.map(function (q) { return q[0]; })), ry = V.range(ring.map(function (q) { return q[1]; })), mx = (rx[1] - rx[0]) * 0.5 + 0.01, my = (ry[1] - ry[0]) * 0.5 + 0.01; P2.range(rx[0] - mx, rx[1] + mx, ry[0] - my, ry[1] + my, true); P2.clear(); P2.axes({ nogrid: true });
      P2.poly(ring, K.a, "rgba(180,68,43,.2)", 2); for (i = 0; i <= n; i++) { var s2 = i / n, l1 = [], l2 = []; for (t = 0; t <= 20; t++) { l1.push(img(x0 + hh * s2, y0 + hh * t / 20)); l2.push(img(x0 + hh * t / 20, y0 + hh * s2)); } P2.path(l1, K.a, 0.8); P2.path(l2, K.a, 0.8); }
      out.textContent = "Area in the uv-plane ÷ area in the xy-plane = " + f2(Math.abs(area(ring)) / (hh * hh)) + " for patch size h = " + f2(hh) + ". It gets closer to |J| as h shrinks.";
    }
    V.slider(box, "patch size h", 0.02, 0.4, 0.01, hh, function (v) { hh = v; draw(); }, function (v) { return f2(v); }); draw();
  };
  CAP["7.6"] = "The second-order Taylor polynomial (orange, dashed) follows f closely near the centre and drifts away further out, where cubic terms matter. Rotate the direction to see f along different lines through the centre.";
  Q["7.6"] = function (box, p) {
    var c = p.c, a = p.a, b = p.b, f = function (x, y) { return c[0] * x * x * x + c[1] * x * x * y + c[2] * x * y * y + c[3] * y * y * y + c[4] * x * y; };
    var fx = 3 * c[0] * a * a + 2 * c[1] * a * b + c[2] * b * b + c[4] * b, fy = c[1] * a * a + 2 * c[2] * a * b + 3 * c[3] * b * b + c[4] * a, fxx = 6 * c[0] * a + 2 * c[1] * b, fxy = 2 * c[1] * a + 2 * c[2] * b + c[4], fyy = 2 * c[2] * a + 6 * c[3] * b;
    var P = Plot(box, { label: "f and its second order Taylor polynomial along a line" }), K, ph = 45, out = V.note(box), T = function (dx, dy) { return f(a, b) + fx * dx + fy * dy + 0.5 * (fxx * dx * dx + 2 * fxy * dx * dy + fyy * dy * dy); };
    P.range(-2, 2, -30, 30);
    function draw() { K = V.col(); var cs = Math.cos(ph * PI / 180), sn = Math.sin(ph * PI / 180), g = function (h) { return f(a + h * cs, b + h * sn); }, ys = []; for (var i = 0; i <= 40; i++) { var h = -2 + 4 * i / 40; ys.push(g(h), T(h * cs, h * sn)); } var r = V.range(ys), pad = (r[1] - r[0]) * 0.15 + 0.5; P.range(-2, 2, r[0] - pad, r[1] + pad); P.clear(); P.axes({ xl: "distance h" }); P.fn(g, -2, 2, K.b, 3); P.fn(function (h) { return T(h * cs, h * sn); }, -2, 2, K.a, 2, [6, 3]); P.dot(0, f(a, b), K.ink, 5); out.textContent = "Direction " + ph + "°. Blue: f along the line. Orange: the Taylor polynomial of degree 2."; }
    V.slider(box, "direction", 0, 180, 5, ph, function (v) { ph = v; draw(); }, function (v) { return v + "°"; }); draw();
  };

  /* ================= Task 8 ================= */
  function cubicMap(box, p, q) {
    var f = function (x, y) { return x * x * x + y * y * y - 3 * p * p * x - 3 * q * q * y; }, R = 1.9 * Math.max(p, q), P = Plot(box, { label: "contour map with stationary points" }), K = V.col(), vals = [], i, j;
    var Rx = 1.9 * p, Ry = 1.9 * q; P.range(-Rx, Rx, -Ry, Ry); P.clear(); P.axes(); for (j = 0; j < 30; j++) for (i = 0; i < 30; i++) vals.push(f(-Rx + 2 * Rx * i / 29, -Ry + 2 * Ry * j / 29)); vals.sort(function (a, b) { return a - b; });
    var lv = []; for (i = 1; i < 16; i++) lv.push(vals[Math.floor(i / 16 * vals.length)]); P.contour(f, lv, K.line, 1.3);
    [[1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(function (s) { var x = s[0] * p, y = s[1] * q, kind = s[0] > 0 && s[1] > 0 ? "min" : s[0] < 0 && s[1] < 0 ? "max" : "saddle", col = kind === "min" ? K.d : kind === "max" ? K.a : K.c; P.dot(x, y, col, 6); P.text(x, y, kind, col, "center", 0, -12); });
    box.appendChild(el("div", "small", "Green: minimum, orange: maximum, purple: saddle (the surface rises one way and falls the other). The grey lines are contours (same height). The two axes use different scales so that all four points fit."));
  }
  CAP["8.1"] = "Contours are lines of equal height. A minimum is the bottom of a bowl (contours circle it), a maximum is the top of a hill, and a saddle is like a mountain pass. Which of the four points is which?";
  Q["8.1"] = function (box, p) { cubicMap(box, p.p, p.q); };
  CAP["8.2"] = "The test rt − s² > 0 means the surface curves the same way in every direction (bowl or hill). rt − s² < 0 means it curves up one way and down the other: a saddle, as at (12, −7)-type points.";
  Q["8.2"] = function (box, p) { cubicMap(box, p.p, p.q); };
  function tangentCircles(box, A, B, C, title) {
    var n2 = A * A + B * B, d = Math.abs(C) / Math.sqrt(n2), tx = A * C / n2, ty = B * C / n2, R = Math.max(2.2 * d, 1), P = Plot(box, { label: title }), K, out = V.note(box), r = 0.3 * d;
    P.range(-R, R, -R, R, true);
    function draw() {
      K = V.col(); P.clear(); P.axes(); P.line(tx, ty, -B, A, K.ink, 2.5); P.circle(0, 0, r, Math.abs(r - d) < 0.03 * d ? K.ok : K.b, 2.5, null, "rgba(31,111,139,.08)");
      P.arrow(0, 0, tx, ty, K.a, 1.5); P.dot(tx, ty, K.a, 5);
      out.textContent = "Circle radius r = " + f2(r) + ", so x² + y² = " + f2(r * r) + ". " + (r < d - 0.03 * d ? "The circle does not reach the line: no point of the line has such a small value." : Math.abs(r - d) <= 0.03 * d ? "The circle just touches the line: this is the minimum. At the touching point the circle's normal and the line's normal point the same way (∇f = λ∇g)." : "The circle cuts the line in two points: you can still lower the value.");
    }
    V.slider(box, "radius r", 0.05 * d, 2.1 * d, d / 100, r, function (v) { r = v; draw(); }, function (v) { return f2(v); }); draw();
  }
  CAP["8.3"] = "Grow a circle x² + y² = r² from the origin until it just touches the constraint line. At the touching point the circle and the line have the same normal direction, which is exactly the Lagrange condition ∇f = λ∇g.";
  Q["8.3"] = function (box, p) { tangentCircles(box, p.A, p.B, p.C, "circles and the constraint line"); };
  CAP["8.4"] = "Each curve xy = k is a hyperbola. Raise k until the hyperbola only just touches the line: that is the maximum of xy on the line (any higher and they no longer meet).";
  Q["8.4"] = function (box, p) {
    var a = p.a, b = p.b, c = p.c, kmax = c * c / (4 * a * b), P = Plot(box, { label: "hyperbolas xy = k and the line" }), K, out = V.note(box), k = 0.3 * kmax; P.range(0, 1.3 * c / a, 0, 1.3 * c / b);
    function draw() { K = V.col(); P.clear(); P.axes({ xl: "x", yl: "y" }); P.seg(0, c / b, c / a, 0, K.ink, 2.5); var disc = c * c - 4 * a * b * k, col = Math.abs(disc) < 0.02 * c * c ? K.ok : K.b; P.fn(function (x) { return k / x; }, 0.001 * c / a, 1.3 * c / a, col, 2.5, null, 400); out.textContent = "xy = " + f2(k) + ": " + (disc < -0.02 * c * c ? "the hyperbola misses the line, so no point on the line has xy this big." : Math.abs(disc) < 0.02 * c * c ? "the hyperbola just touches the line: this is the maximum." : "it cuts the line in two points: a larger value is still possible."); }
    V.slider(box, "k in xy = k", 0.02 * kmax, 1.8 * kmax, kmax / 200, k, function (v) { k = v; draw(); }, function (v) { return f2(v); }); draw();
  };
  CAP["8.5"] = "In three variables the level sets are spheres and the constraint is a plane. This picture is a slice through the centre along the plane's normal: grow the sphere until it just touches the plane. The distance to the plane gives the minimum of x² + y² + z².";
  Q["8.5"] = function (box, p) { tangentCircles(box, Math.sqrt(p.A * p.A + p.B * p.B + p.C * p.C), 0, p.D, "side view: spheres growing until they touch the plane"); };

  /* ================= Task 9 ================= */
  CAP["9.1"] = "A sequence converges when its dots settle on a level. Top: the dots a_n approach the dashed limit. Bottom: for the root test, the n-th root of the term settles below 1 (convergent), above 1 (divergent) or at 1 (test fails).";
  Q["9.1"] = function (box, p) {
    var c = p.c, r = p.root, L = c[0] / c[3];
    seq(box, function (n) { return (c[0] * n * n + c[1] * n + c[2]) / (c[3] * n * n + c[4]); }, 40, [[L, null, "limit"]], { yl: "a_n", label: "terms of the sequence" });
    var L2 = r[0] / r[2]; box.appendChild(el("div", "small", "Root test: the n-th root of the n-th term, compared with 1"));
    seq(box, function (n) { return (r[0] * n + r[1]) / (r[2] * n + r[3]); }, 40, [[L2, null, "limit"], [1, V.col().c, "1"]], { yl: "(a_n)^(1/n)" });
  };
  CAP["9.2"] = "The integral test compares the sum with the area under 1/x^p. Rectangles of width 1 sit just above the curve, so if the area is finite the sum is finite. The right picture is the tail beyond N: its area bounds the leftover.";
  Q["9.2"] = function (box, p) {
    function bars(x0, x1, title) {
      box.appendChild(el("div", "small", title)); var P = Plot(box, { h: 200, label: title }), K = V.col(), f = function (x) { return Math.pow(x, -p.p); }; P.range(x0 - 0.5, x1 + 0.5, 0, f(Math.max(x0, 1)) * 1.2); P.clear(); P.axes({ xl: "x" });
      var n; for (n = Math.ceil(x0); n <= x1; n++) P.poly([[n, 0], [n + 1, 0], [n + 1, f(n)], [n, f(n)]], K.line, "rgba(31,111,139,.15)", 1); P.fn(f, Math.max(x0, 0.5), x1 + 1, K.a, 3);
    }
    bars(1, 8, "Start of the series: rectangles (areas = terms) above the curve 1/x^" + p.p); bars(p.N, p.N + 8, "Tail from N = " + p.N + ": the area under the curve bounds the sum of all remaining terms");
  };
  CAP["9.3"] = "Comparison: for large n the term behaves like 1/n^p. If the ratio of the two settles on a positive finite number, both series do the same thing: converge together or diverge together.";
  Q["9.3"] = function (box, p) {
    var pp = p.k - 2, an = function (n) { return (p.a * n * n + p.b * n) / (p.c * Math.pow(n, p.k) + p.d); };
    var P = Plot(box, { label: "terms and comparison terms (log scale)" }), K = V.col(), pts1 = [], pts2 = [], n; for (n = 1; n <= 60; n++) { pts1.push([n, Math.log10(an(n))]); pts2.push([n, Math.log10(Math.pow(n, -pp))]); }
    var r = V.range(pts1.concat(pts2).map(function (q) { return q[1]; })); P.range(1, 60, r[0] - 0.3, r[1] + 0.3); P.clear(); P.axes({ xl: "n", yl: "log10 of term" }); P.path(pts1, K.b, 2.5); P.path(pts2, K.a, 2.5, [5, 3]); P.text(60, pts1[59][1], "a_n", K.b, "right", -2, -9); P.text(60, pts2[59][1], "1/n^p", K.a, "right", -2, 9);
    box.appendChild(el("div", "small", "Both curves run parallel on this log scale: they shrink at the same rate."));
    seq(box, function (n) { return an(n) * Math.pow(n, pp); }, 60, [[p.a / p.c, null, "limit"]], { yl: "a_n ÷ (1/n^p)", h: 190 });
  };
  CAP["9.4"] = "Ratio test: look at a_{n+1}/a_n. Below 1 in the limit means convergent. Raabe's test is for the delicate case where that ratio tends to 1: it magnifies the difference as n(a_n/a_{n+1} − 1) and compares the limit with 1.";
  Q["9.4"] = function (box, p) {
    box.appendChild(el("div", "small", "(a) ratio a_{n+1}/a_n"));
    seq(box, function (n) { return (n + 4) / (p.q * (n + 3)); }, 30, [[1 / p.q, null, "limit"], [1, V.col().c, "1"]], { yl: "a_{n+1}/a_n", h: 190 });
    box.appendChild(el("div", "small", "(b) Raabe's quantity n(a_n/a_{n+1} − 1) against the threshold 1"));
    seq(box, function (n) { return n * (p.be - p.al) / (n + p.al); }, 60, [[p.be - p.al, null, "limit"], [1, V.col().c, "1"]], { yl: "Raabe", h: 190 });
  };
  CAP["9.5"] = "For an alternating series with decreasing terms the partial sums zig-zag and squeeze in on the sum. The gap between S_N and the limit is smaller than the first omitted term, which is the error bound. Slide b to see absolute, conditional and no convergence.";
  Q["9.5"] = function (box, p) {
    var an = function (n) { return 1 / (n * n + p.p); }, S = function (n) { return V.sum(function (k) { return (k % 2 ? 1 : -1) * an(k); }, 1, n); }, N = p.N, K = V.col();
    box.appendChild(el("div", "small", "(a) partial sums S_n; the shaded band is S_N ± a_{N+1}"));
    var P = seq(box, S, N + 10, [], { yl: "S_n", h: 200 }), band = an(N + 1), SN = S(N); K = V.col(); P.poly([[P.x0, SN - band], [P.x1, SN - band], [P.x1, SN + band], [P.x0, SN + band]], null, "rgba(180,68,43,.15)"); P.dot(N, SN, K.a, 5);
    box.appendChild(el("div", "small", "(b) series Σ(−1)^n n^" + p.a + " / n^b : partial sums (blue) and partial sums of the absolute values (orange)"));
    var P2 = Plot(box, { h: 210, label: "partial sums for the chosen b" }), out = V.note(box), e = p.a, b = e + 1;
    function draw() {
      K = V.col(); var t = b - e, M = 120, pts = [], pa = [], s = 0, sa = 0, n; for (n = 1; n <= M; n++) { var term = Math.pow(n, e - b); s += (n % 2 ? -1 : 1) * term; sa += term; pts.push([n, s]); pa.push([n, sa]); }
      var r = V.range(pts.concat(pa).map(function (q) { return q[1]; })), lo = Math.max(r[0], -20), hi = Math.min(r[1], 20), pad = (hi - lo) * 0.15 + 0.5; P2.range(1, M, lo - pad, hi + pad); P2.clear(); P2.axes({ xl: "n" }); P2.path(pa, K.a, 2); P2.path(pts, K.b, 2.5);
      out.textContent = "b = " + b + " (so terms behave like 1/n^" + t + "): " + (t > 1 ? "absolutely convergent (both curves level off)." : t > 0 ? "conditionally convergent: the blue curve settles but the orange one keeps climbing forever." : "terms do not tend to 0: divergent.");
    }
    V.slider(box, "b", 0, e + 4, 1, b, function (v) { b = v; draw(); }); draw();
  };
  CAP["9.6"] = "A series sum is the limit of its partial sums. The dots climb towards the dashed level. A geometric series with |r| < 1 and a telescoping series both settle on a finite value that you can compute exactly.";
  Q["9.6"] = function (box, p) {
    var L1 = p.c / (1 - p.ratio);
    box.appendChild(el("div", "small", "(a) partial sums of the geometric series"));
    seq(box, function (n) { return p.c * (1 - Math.pow(p.ratio, n + 1)) / (1 - p.ratio); }, 20, [[L1, null, "sum"]], { yl: "S_n", from: 0, h: 190 });
    var L2 = 0; for (var j = 1; j <= p.k; j++) L2 += 1 / j; L2 /= p.k;
    box.appendChild(el("div", "small", "(b) partial sums of Σ 1/(n(n+" + p.k + "))"));
    seq(box, function (n) { var s = 0; for (var j2 = 1; j2 <= n; j2++) s += 1 / (j2 * (j2 + p.k)); return s; }, 40, [[L2, null, "sum"]], { yl: "S_n", h: 190 });
  };

  V.osc = osc; V.ellEvolute = ellEvolute;
  /* ---------- public ---------- */
  V.hasQuestion = function (qid) { return !!Q[qid]; };
  V.question = function (qid, p, st) {
    var box = el("div", "vbox"); try { Q[qid](box, p, st || {}); } catch (e) { box.textContent = "Picture could not be drawn on this device."; if (window.console) console.error(qid, e); return box; }
    var cap = el("div", "vcap"); cap.appendChild(el("b", null, "What to notice: ")); cap.appendChild(document.createTextNode(CAP[qid] || "")); box.appendChild(cap); return box;
  };
})();
