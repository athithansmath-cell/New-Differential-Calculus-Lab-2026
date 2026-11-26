/* lab.js - one interactive "Explore it" lab per task (sliders and buttons, no questions, nothing to type).
   ExamViz.lab(task) returns a <div>, or null for the mock exam. ExamViz.scoreBars draws the mock-exam result by task. */
(function () {
  "use strict";
  var V = window.ExamViz, el = V.el, f2 = V.f2, f3 = V.f3, Plot = V.Plot, PI = Math.PI, L = {};

  function sect(box, title, tip) { box.appendChild(el("div", "vsub", title)); if (tip) box.appendChild(el("div", "small", tip)); }
  function btns(box, names, fn, first) {
    var row = el("div", "row vbtn"), all = [];
    names.forEach(function (n, i) { var b = el("button", "ghost", n); b.addEventListener("click", function () { all.forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); fn(i); }); all.push(b); row.appendChild(b); });
    box.appendChild(row); if (all[first || 0]) all[first || 0].classList.add("on"); return all;
  }

  /* ---- Task 1: what a matrix does ---- */
  L[1] = function (box) {
    var M = [2, 1, 1, 2], names = ["a", "b", "c", "d"], sl = [], P = Plot(box, { label: "the plane before and after the matrix" }), out = V.note(box), K;
    P.range(-4.5, 4.5, -4.5, 4.5, true);
    function draw() {
      K = V.col(); P.clear(); P.axes({ nogrid: true }); var A = [[M[0], M[1]], [M[2], M[3]]], i, d = V.det2(A);
      for (i = -3; i <= 3; i++) { P.seg(i, -3, i, 3, K.line, 1); P.seg(-3, i, 3, i, K.line, 1); }
      for (i = -3; i <= 3; i++) { var a = V.mulv(A, [i, -3]), b = V.mulv(A, [i, 3]), c = V.mulv(A, [-3, i]), e = V.mulv(A, [3, i]); P.seg(a[0], a[1], b[0], b[1], i === 0 ? K.mute : "rgba(180,68,43,.35)", 1.2); P.seg(c[0], c[1], e[0], e[1], i === 0 ? K.mute : "rgba(180,68,43,.35)", 1.2); }
      var sq = [[0, 0], [1, 0], [1, 1], [0, 1]]; P.poly(sq, K.b, "rgba(31,111,139,.25)", 2); P.poly(sq.map(function (q) { return V.mulv(A, q); }), K.a, "rgba(180,68,43,.25)", 2);
      P.arrow(0, 0, M[0], M[2], K.d, 3); P.arrow(0, 0, M[1], M[3], K.c, 3); P.text(M[0], M[2], "A·e1", K.d, "left", 6, -6); P.text(M[1], M[3], "A·e2", K.c, "left", 6, -6);
      var rank = Math.abs(d) > 0.02 ? 2 : (Math.hypot.apply(null, M) > 0.05 ? 1 : 0);
      out.textContent = "det A = " + f2(d) + " (the area of the unit square becomes " + f2(Math.abs(d)) + "), rank = " + rank + ". " + (rank === 2 ? "The two columns are independent: they point in different directions and span the whole plane, so A is invertible." : rank === 1 ? "The columns lie on one line (dependent): the whole plane is squashed onto a line, information is lost, A has no inverse." : "Everything collapses to the origin.");
    }
    names.forEach(function (n, i) { sl.push(V.slider(box, "entry " + n, -3, 3, 0.1, M[i], function (v) { M[i] = v; draw(); }, f2)); });
    sect(box, "Quick matrices");
    btns(box, ["Stretch", "Rotate 90°", "Shear", "Singular (dependent)"], function (k) {
      M = [[2, 0, 0, 1], [0, -1, 1, 0], [1, 1, 0, 1], [1, 2, 0.5, 1]][k]; sl.forEach(function (s, i) { s.set(M[i]); }); draw();
    }, -1);
    draw();
  };
  L[1].tip = "Move the sliders. Watch the blue unit square turn into the orange parallelogram. Make the two columns point the same way and see the plane collapse (determinant 0, rank 1).";

  /* ---- Task 2: eigen directions, Cayley-Hamilton, powers ---- */
  L[2] = function (box) {
    var M = [2, 1, 1, 2], sl = [], P = Plot(box, { label: "eigen-directions of a matrix" }), out = V.note(box), out2 = V.note(box), K, k = 0;
    P.range(-1.3, 1.3, -1.3, 1.3, true);
    function draw() {
      K = V.col(); var A = [[M[0], M[1]], [M[2], M[3]]], E = V.eig2(A), n = Math.max(Math.hypot.apply(null, M), 0.3), i;
      P.clear(); P.axes({ nogrid: true }); P.circle(0, 0, 1, K.line, 1.2); var im = []; for (i = 0; i <= 100; i++) { var t = i / 100 * 2 * PI, w = V.mulv(A, [Math.cos(t), Math.sin(t)]); im.push([w[0] / n, w[1] / n]); } P.path(im, K.mute, 1.5, [4, 3]);
      if (E.real) { P.line(0, 0, E.v1[0], E.v1[1], K.d, 1.8); P.line(0, 0, E.v2[0], E.v2[1], K.c, 1.8); }
      var v = [1, 0.3], j; for (j = 0; j <= k; j++) { var nn = Math.hypot(v[0], v[1]); if (j < k) P.dot(v[0] / nn, v[1] / nn, K.mute, 3); else P.arrow(0, 0, v[0] / nn, v[1] / nn, K.a, 3); v = V.mulv(A, v); }
      var tr = M[0] + M[3], d = V.det2(A), A2 = [[M[0] * M[0] + M[1] * M[2], M[0] * M[1] + M[1] * M[3]], [M[2] * M[0] + M[3] * M[2], M[2] * M[1] + M[3] * M[3]]];
      out.textContent = E.real ? "Eigenvalues: " + f2(E.l1) + " (green line) and " + f2(E.l2) + " (purple line). Trace = " + f2(tr) + " = sum of eigenvalues; det = " + f2(d) + " = their product." : "Complex eigenvalues: the matrix turns every direction, so there are no real eigen-directions (tr = " + f2(tr) + ", det = " + f2(d) + ").";
      out2.textContent = "Cayley–Hamilton check: A² − (tr)A + (det)I = [[" + f2(A2[0][0] - tr * M[0] + d) + ", " + f2(A2[0][1] - tr * M[1]) + "], [" + f2(A2[1][0] - tr * M[2]) + ", " + f2(A2[1][1] - tr * M[3] + d) + "]], always the zero matrix.";
    }
    ["a", "b", "c", "d"].forEach(function (nm, i) { sl.push(V.slider(box, "entry " + nm, -3, 3, 0.1, M[i], function (v) { M[i] = v; draw(); }, f2)); });
    V.slider(box, "apply A this many times to a starting arrow (power k)", 0, 10, 1, 0, function (v) { k = v; draw(); });
    sect(box, "Quick matrices");
    btns(box, ["Symmetric", "Dominant eigenvalue", "Rotation (no real eigenvector)", "Triangular"], function (q) { M = [[2, 1, 1, 2], [3, 1, 0, 0.5], [0, -1, 1, 0], [2, 1, 0, 3]][q]; sl.forEach(function (s, i) { s.set(M[i]); }); draw(); }, -1);
    draw();
  };
  L[2].tip = "The green and purple lines are the eigen-directions: A only stretches along them. Raise the power slider and watch any starting arrow swing towards the dominant eigen-direction (this is diagonalisation at work). The check line shows Cayley–Hamilton is always true.";

  /* ---- Task 3: ODE models ---- */
  L[3] = function (box) {
    sect(box, "1 · Cooling and charging: y' = −k(y − T)", "A cup of tea cooling, a battery charging and a drug leaving the body all follow this equation.");
    var k = 0.5, T = 20, y0 = 90, P1 = Plot(box, { h: 220, label: "first-order model" }), o1 = V.note(box), K;
    function d1() { K = V.col(); P1.range(0, 10, Math.min(T, y0) - 10, Math.max(T, y0) + 10); P1.clear(); P1.axes({ xl: "time", yl: "y" }); P1.slopes(function (x, y) { return -k * (y - T); }, 18, 12, K.line, 14); P1.seg(0, T, 10, T, K.mute, 1.2, [4, 3]); P1.fn(function (t) { return T + (y0 - T) * Math.exp(-k * t); }, 0, 10, K.b, 3); P1.dot(0, y0, K.a, 5); o1.textContent = "y(t) = " + f2(T) + " + (" + f2(y0 - T) + ")e^(−" + f2(k) + "t). It always settles at T = " + f2(T) + "; a larger k means a faster settle (half the gap closes every " + f2(Math.LN2 / k) + " time units)."; }
    V.slider(box, "rate k", 0.1, 2, 0.05, k, function (v) { k = v; d1(); }, f2); V.slider(box, "target T", -20, 60, 1, T, function (v) { T = v; d1(); }); V.slider(box, "start y(0)", -20, 120, 1, y0, function (v) { y0 = v; d1(); }); d1();
    sect(box, "2 · Springs and circuits: y'' + 2ζω y' + ω² y = 0", "A car's suspension, a door closer and an RLC circuit. ζ (zeta) is the damping.");
    var z = 0.2, w = 2, P2 = Plot(box, { h: 220, label: "second-order model" }), o2 = V.note(box);
    function sol(t) { if (Math.abs(z - 1) < 0.02) return (1 + w * t) * Math.exp(-w * t); if (z < 1) { var wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t)); } var s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s; return (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1); }
    function d2() { K = V.col(); P2.range(0, 10, -1.1, 1.1); P2.clear(); P2.axes({ xl: "time" }); if (z < 1) { var env = function (t) { return Math.exp(-z * w * t); }; P2.fn(env, 0, 10, K.line, 1.5, [4, 3]); P2.fn(function (t) { return -env(t); }, 0, 10, K.line, 1.5, [4, 3]); } P2.fn(sol, 0, 10, K.a, 3, null, 500);
      var disc = z * z - 1; o2.textContent = "Auxiliary roots m = " + (disc > 0.0004 ? f2(-z * w + w * Math.sqrt(disc)) + " and " + f2(-z * w - w * Math.sqrt(disc)) + " (two real roots): over-damped, no oscillation." : Math.abs(z - 1) <= 0.02 ? f2(-w) + " repeated: critically damped, the fastest return without overshoot." : f2(-z * w) + " ± " + f2(w * Math.sqrt(1 - z * z)) + "i (complex): under-damped, oscillates inside the dashed envelope."); }
    V.slider(box, "damping ζ", 0, 2, 0.05, z, function (v) { z = v; d2(); }, f2); V.slider(box, "natural frequency ω", 0.5, 5, 0.1, w, function (v) { w = v; d2(); }, f2); d2();
  };
  L[3].tip = "Change one slider at a time. In the first model see how k controls speed. In the second watch the three behaviours (oscillating, critical, creeping) change as the roots of the auxiliary equation change from complex to real.";

  /* ---- Task 4: Legendre and Cauchy-Euler ---- */
  L[4] = function (box) {
    sect(box, "1 · Legendre polynomials P_n(x)", "These solve (1 − x²)y'' − 2xy' + n(n+1)y = 0. They appear in antennas, gravity fields and heat flow on a sphere.");
    var n = 3, P = Plot(box, { label: "Legendre polynomial" }), o = V.note(box), K;
    function d() { K = V.col(); P.range(-1, 1, -1.2, 1.2); P.clear(); P.axes({ xl: "x" }); for (var j = 0; j < n; j++) (function (j) { P.fn(function (x) { return V.legendre(j, x); }, -1, 1, K.line, 1.2); })(j); P.fn(function (x) { return V.legendre(n, x); }, -1, 1, K.b, 3, null, 300); var rs = V.roots(function (x) { return V.legendre(n, x); }, -1, 1); rs.forEach(function (r) { P.dot(r, 0, K.a, 4); }); o.textContent = "P" + n + " has " + rs.length + " zeros between −1 and 1 (orange dots); P" + n + "(1) = 1; it is " + (n % 2 ? "an odd" : "an even") + " function."; }
    V.slider(box, "degree n", 0, 8, 1, n, function (v) { n = v; d(); }); d();
    sect(box, "2 · Cauchy–Euler: x²y'' + (1 − m1 − m2) x y' + m1 m2 y = 0", "Solutions are powers of x. Put x = e^t and the equation becomes one with constant coefficients.");
    var m1 = 1, m2 = 3, P2 = Plot(box, { label: "Cauchy-Euler solutions" }), o2 = V.note(box);
    function d2() { K = V.col(); P2.range(0.2, 3, -2, 10); P2.clear(); P2.axes({ xl: "x" }); P2.fn(function (x) { return Math.pow(x, m1); }, 0.2, 3, K.b, 2.5); P2.fn(function (x) { return Math.pow(x, m2); }, 0.2, 3, K.a, 2.5); o2.textContent = "The two basic solutions are x^" + f2(m1) + " (blue) and x^" + f2(m2) + " (orange). Every solution is a mixture C1·x^" + f2(m1) + " + C2·x^" + f2(m2) + ". Their roles swap at x = 1, where both equal 1."; }
    V.slider(box, "power m1", -3, 4, 0.5, m1, function (v) { m1 = v; d2(); }, f2); V.slider(box, "power m2", -3, 4, 0.5, m2, function (v) { m2 = v; d2(); }, f2); d2();
  };
  L[4].tip = "Slide the degree n and count the zeros: P_n always has exactly n of them. Then change the two powers in the Cauchy–Euler picture and see how the curves behave near x = 0 and for large x.";

  /* ---- Task 5: curvature ---- */
  L[5] = function (box) {
    var holder = el("div"), cur = 0;
    var defs = [
      { n: "Parabola y = x²/4", fx: function (t) { return t; }, fy: function (t) { return t * t / 4; }, a: -6, b: 6, i: 2 },
      { n: "Ellipse (4 by 2)", fx: function (t) { return 4 * Math.cos(t); }, fy: function (t) { return 2 * Math.sin(t); }, a: 0, b: 2 * PI, i: 0.8 },
      { n: "Sine wave y = 2 sin x", fx: function (t) { return t; }, fy: function (t) { return 2 * Math.sin(t); }, a: -PI * 1.5, b: PI * 1.5, i: 0.6 },
      { n: "Cardioid r = 1 + cos θ", fx: function (t) { return (1 + Math.cos(t)) * Math.cos(t); }, fy: function (t) { return (1 + Math.cos(t)) * Math.sin(t); }, a: -3.05, b: 3.05, i: 1.2 }
    ];
    function show(i) { holder.innerHTML = ""; var d = defs[i]; V.osc(holder, d.fx, d.fy, d.a, d.b, d.i, { road: true, label: "position" }); }
    sect(box, "Choose a curve", "Slide along it. The dashed circle is the circle of curvature, its radius is ρ.");
    btns(box, defs.map(function (d) { return d.n; }), function (i) { cur = i; show(i); }, 0); box.appendChild(holder); show(0);
  };
  L[5].tip = "Find the place where the circle is smallest: that is the sharpest bend, where a road needs the lowest speed limit. Find where the circle becomes huge: the curve is almost straight.";

  /* ---- Task 6: evolute, involute, envelope ---- */
  L[6] = function (box) {
    sect(box, "1 · Evolute of an ellipse", "The orange curve is the path of the centre of curvature.");
    var A = 5, B = 3, h = el("div"); box.appendChild(h);
    function s1() { h.innerHTML = ""; V.ellEvolute(h, A, B, 0.8, false); }
    V.slider(box, "long half-axis A", 2, 8, 0.5, A, function (v) { A = v; if (B > A) B = A - 0.5; s1(); }, f2); V.slider(box, "short half-axis B", 0.5, 7, 0.5, B, function (v) { B = Math.min(v, A - 0.5); s1(); }, f2); s1();
    sect(box, "2 · Involute of a circle: the shape of a gear tooth", "Unwind a taut string from a circle: its free end draws the involute. Gear teeth of this shape roll without sliding, so power passes smoothly.");
    var phi = 2, P = Plot(box, { label: "involute of a circle" }), o = V.note(box), K;
    P.range(-3, 5, -4, 4, true);
    function s2() { K = V.col(); P.clear(); P.axes(); P.circle(0, 0, 1, K.b, 2.5); P.param(function (t) { return Math.cos(t) + t * Math.sin(t); }, function (t) { return Math.sin(t) - t * Math.cos(t); }, 0, 7, K.line, 1.5); P.param(function (t) { return Math.cos(t) + t * Math.sin(t); }, function (t) { return Math.sin(t) - t * Math.cos(t); }, 0, phi, K.a, 3);
      var tx = Math.cos(phi), ty = Math.sin(phi), ex = tx + phi * Math.sin(phi), ey = ty - phi * Math.cos(phi); P.seg(tx, ty, ex, ey, K.ink, 1.8); P.dot(tx, ty, K.b, 4); P.dot(ex, ey, K.a, 5); o.textContent = "String length = arc unwound = " + f2(phi) + ". The string is always the radius of curvature of the involute at its end, and the circle is the evolute of the involute."; }
    V.slider(box, "unwound angle", 0, 7, 0.05, phi, function (v) { phi = v; s2(); }, f2); s2();
    sect(box, "3 · A sliding ladder and its envelope", "A ladder of length 1 slides down a wall. Every position is a line of the family x/a + y/b = 1 with a² + b² = 1. The lines never cross the curve x^(2/3) + y^(2/3) = 1 (the astroid), they only touch it.");
    var th = 0.7, P3 = Plot(box, { label: "ladder positions and astroid" }), o3 = V.note(box);
    P3.range(-0.1, 1.1, -0.1, 1.1, true);
    function s3() { K = V.col(); P3.clear(); P3.axes(); for (var i = 0; i * 0.04 <= th; i++) { var t = i * 0.04; P3.seg(Math.cos(t), 0, 0, Math.sin(t), K.line, 1); } P3.param(function (t) { return Math.pow(Math.cos(t), 3); }, function (t) { return Math.pow(Math.sin(t), 3); }, 0, PI / 2, K.b, 3); P3.seg(Math.cos(th), 0, 0, Math.sin(th), K.a, 3); P3.dot(Math.pow(Math.cos(th), 3), Math.pow(Math.sin(th), 3), K.ink, 5); o3.textContent = "The ladder touches the envelope at (" + f2(Math.pow(Math.cos(th), 3)) + ", " + f2(Math.pow(Math.sin(th), 3)) + ")."; }
    V.slider(box, "ladder angle", 0.05, 1.5, 0.01, th, function (v) { th = v; s3(); }, f2); s3();
  };
  L[6].tip = "In picture 1, slide θ: the normal to the ellipse is tangent to the evolute. In picture 2 unwind the string. In picture 3 watch many straight lines build a curved edge.";

  /* ---- Task 7: partial derivatives and gradient ---- */
  L[7] = function (box) {
    var F = [
      { n: "x² − y² (saddle)", f: function (x, y) { return x * x - y * y; } }, { n: "x² + y² (bowl)", f: function (x, y) { return x * x + y * y; } },
      { n: "sin x · cos y (waves)", f: function (x, y) { return Math.sin(x) * Math.cos(y); } }, { n: "x·y", f: function (x, y) { return x * y; } }], cur = 0, x0 = 1, y0 = 0.5, al = 30;
    var P = Plot(box, { label: "contour map with gradient" }), out = V.note(box), K; P.range(-3, 3, -3, 3, true);
    function draw() {
      K = V.col(); var f = F[cur].f, h = 1e-4, fx = (f(x0 + h, y0) - f(x0 - h, y0)) / (2 * h), fy = (f(x0, y0 + h) - f(x0, y0 - h)) / (2 * h), g = Math.hypot(fx, fy);
      P.clear(); P.axes(); var lv = []; for (var i = -8; i <= 8; i++) lv.push(i * 0.6); P.contour(f, lv, K.line, 1.2); P.contour(f, [f(x0, y0)], K.b, 2.5); P.dot(x0, y0, K.ink, 5);
      var s = 1 / (g + 1e-9) * 1.2; if (g > 1e-6) P.arrow(x0, y0, x0 + fx * s, y0 + fy * s, K.d, 2.5);
      var ca = Math.cos(al * PI / 180), sa = Math.sin(al * PI / 180); P.arrow(x0, y0, x0 + ca * 1.2, y0 + sa * 1.2, K.a, 2.5);
      out.textContent = "At (" + f2(x0) + ", " + f2(y0) + "): f = " + f2(f(x0, y0)) + ", f_x = " + f2(fx) + ", f_y = " + f2(fy) + ". Green arrow: the gradient (f_x, f_y), the steepest-uphill direction, always at right angles to the blue contour. Orange arrow: your chosen direction, along which f changes at rate f_x cos α + f_y sin α = " + f2(fx * ca + fy * sa) + " (the largest possible is |∇f| = " + f2(g) + ").";
    }
    sect(box, "Choose a surface z = f(x, y)", "Contours are lines of equal height.");
    btns(box, F.map(function (d) { return d.n; }), function (i) { cur = i; draw(); }, 0);
    V.slider(box, "x", -2.5, 2.5, 0.1, x0, function (v) { x0 = v; draw(); }, f2); V.slider(box, "y", -2.5, 2.5, 0.1, y0, function (v) { y0 = v; draw(); }, f2); V.slider(box, "direction α", 0, 360, 5, al, function (v) { al = v; draw(); }, function (v) { return v + "°"; }); draw();
  };
  L[7].tip = "Move the point and the direction. Rotate α until the rate of change is largest: it points along the green gradient. Rotate it along the blue contour: the rate is 0. This is the picture behind the chain rule, the Jacobian and optimisation.";

  /* ---- Task 8: constrained optimisation ---- */
  L[8] = function (box) {
    var obj = [{ n: "Minimise x² + y²", f: function (x, y) { return x * x + y * y; } }, { n: "Maximise x·y", f: function (x, y) { return x * y; } }, { n: "Maximise 2x + y", f: function (x, y) { return 2 * x + y; } }], cur = 0, A = 1, B = 2, C = 4;
    var P = Plot(box, { label: "level curves, constraint line and the best point" }), P2 = Plot(box, { h: 190, label: "value along the constraint line" }), out = V.note(box), K; P.range(-5, 5, -5, 5, true);
    function draw() {
      K = V.col(); var f = obj[cur].f, n2 = A * A + B * B, bx = A * C / n2, by = B * C / n2, dx = -B / Math.sqrt(n2), dy = A / Math.sqrt(n2), g = function (s) { return f(bx + s * dx, by + s * dy); }, h = 1e-4;
      P.clear(); P.axes(); var lv = [], i; for (i = -10; i <= 10; i++) lv.push(i * 2); P.contour(f, lv, K.line, 1.1); P.line(bx, by, dx, dy, K.ink, 2.5);
      var cs = V.roots(function (s) { return (g(s + h) - g(s - h)) / (2 * h); }, -8, 8); if (cs.length > 6) cs = []; cs.forEach(function (s) { var x = bx + s * dx, y = by + s * dy; P.contour(f, [f(x, y)], K.b, 2.2); P.dot(x, y, K.a, 6); });
      var ys = []; for (i = 0; i <= 60; i++) ys.push(g(-8 + 16 * i / 60)); var r = V.range(ys), pad = (r[1] - r[0]) * 0.15 + 1; P2.range(-8, 8, r[0] - pad, r[1] + pad); P2.clear(); P2.axes({ xl: "distance s along the line", yl: "f on the line" }); P2.fn(g, -8, 8, K.b, 3); cs.forEach(function (s) { P2.dot(s, g(s), K.a, 6); });
      if (cs.length) { var s0 = cs[0], x0 = bx + s0 * dx, y0 = by + s0 * dy, gf = obj[cur].f, fx = (gf(x0 + h, y0) - gf(x0 - h, y0)) / (2 * h), fy = (gf(x0, y0 + h) - gf(x0, y0 - h)) / (2 * h), lam = Math.abs(A) > 1e-9 ? fx / A : fy / B; out.textContent = "Best point (" + f2(x0) + ", " + f2(y0) + "), value " + f2(gf(x0, y0)) + ". There the blue level curve just touches the black constraint line, so ∇f = λ∇g with λ = " + f2(lam) + ". Below: f along the line has a flat spot at the same point."; }
      else out.textContent = "On this line f has no stationary point (it keeps rising in one direction).";
    }
    sect(box, "Choose an objective", "Constraint: A x + B y = C (black line).");
    btns(box, obj.map(function (d) { return d.n; }), function (i) { cur = i; draw(); }, 0);
    V.slider(box, "A", -3, 3, 0.1, A, function (v) { A = Math.abs(v) < 0.05 && Math.abs(B) < 0.05 ? 0.1 : v; draw(); }, f2); V.slider(box, "B", -3, 3, 0.1, B, function (v) { B = Math.abs(v) < 0.05 && Math.abs(A) < 0.05 ? 0.1 : v; draw(); }, f2); V.slider(box, "C", -8, 8, 0.1, C, function (v) { C = v; draw(); }, f2); draw();
  };
  L[8].tip = "Tilt and move the black line. The blue curve is the level curve through the best point: it only touches the line there. The lower graph shows the same problem as an ordinary one-variable max/min, which is why Lagrange's method works.";

  /* ---- Task 9: series ---- */
  L[9] = function (box) {
    var kinds = [
      { n: "Geometric Σ rⁿ", lab: "ratio r", min: -1.4, max: 1.4, st: 0.05, v: 0.7, term: function (n, r) { return Math.pow(r, n); }, from: 0, lim: function (r) { return Math.abs(r) < 1 ? 1 / (1 - r) : null; }, say: function (r) { return Math.abs(r) < 1 ? "|r| < 1: converges, sum = 1/(1 − r)." : "|r| ≥ 1: the terms do not shrink to 0, so the series diverges."; } },
      { n: "p-series Σ 1/nᵖ", lab: "power p", min: 0.5, max: 3, st: 0.05, v: 1, term: function (n, p) { return Math.pow(n, -p); }, from: 1, lim: function (p) { return null; }, say: function (p) { return p > 1 ? "p > 1: converges (integral test). The ratio test is useless here: a_(n+1)/a_n → 1." : "p ≤ 1: diverges (integral test). The terms go to 0, yet the sum is infinite, so 'terms → 0' is not enough."; } },
      { n: "Alternating Σ (−1)ⁿ⁺¹/nᵖ", lab: "power p", min: 0.2, max: 3, st: 0.05, v: 1, term: function (n, p) { return (n % 2 ? 1 : -1) * Math.pow(n, -p); }, from: 1, lim: function () { return null; }, say: function (p) { return p > 1 ? "p > 1: converges absolutely (even with all signs made +)." : "0 < p ≤ 1: converges only because of the alternating signs (Leibnitz): conditional convergence."; } },
      { n: "Exponential series Σ xⁿ/n!", lab: "x", min: 0, max: 8, st: 0.1, v: 2, term: function (n, x) { var t = 1, k; for (k = 1; k <= n; k++) t *= x / k; return t; }, from: 0, lim: function (x) { return Math.exp(x); }, say: function (x) { return "Ratio test: a_(n+1)/a_n = x/(n+1) → 0 < 1 for every x, so it always converges, to e^x."; } }
    ], cur = 0, par = kinds[0].v, N = 30, P = Plot(box, { label: "partial sums" }), P2 = Plot(box, { h: 180, label: "ratio of consecutive terms" }), out = V.note(box), K, sl;
    function draw() {
      K = V.col(); var d = kinds[cur], pts = [], rp = [], s = 0, n; for (n = d.from; n <= N; n++) { s += d.term(n, par); pts.push([n, s]); var t2 = d.term(n + 1, par), t1 = d.term(n, par); if (n >= 1 && Math.abs(t1) > 1e-300) rp.push([n, Math.abs(t2 / t1)]); }
      var r = V.range(pts.map(function (q) { return q[1]; })), lim = d.lim(par), lo = Math.max(r[0], -30), hi = Math.min(r[1], 30); if (lim != null && isFinite(lim)) { lo = Math.min(lo, lim); hi = Math.max(hi, lim); } var pad = (hi - lo) * 0.15 + 0.5;
      P.range(d.from, N, lo - pad, hi + pad); P.clear(); P.axes({ xl: "n", yl: "partial sum S_n" }); if (lim != null && isFinite(lim) && lim <= 30) { P.seg(d.from, lim, N, lim, K.a, 1.5, [5, 3]); P.text(N, lim, "sum", K.a, "right", -2, -9); } P.path(pts, K.line, 1); pts.forEach(function (q) { P.dot(q[0], q[1], K.b, 3); });
      var rr = V.range(rp.map(function (q) { return q[1]; })); P2.range(1, N, Math.min(0, rr[0]) - 0.1, Math.max(1.3, Math.min(rr[1], 3)) + 0.1); P2.clear(); P2.axes({ xl: "n", yl: "|a(n+1)/a(n)|" }); P2.seg(1, 1, N, 1, K.c, 1.5, [5, 3]); P2.path(rp, K.d, 2.5);
      out.textContent = d.say(par) + " (Purple dashed line in the lower graph: ratio = 1, the boundary of the ratio test.)";
    }
    sect(box, "Choose a series", "Upper graph: partial sums. Lower graph: the ratio of consecutive terms.");
    var bs = btns(box, kinds.map(function (d) { return d.n; }), function (i) { cur = i; par = kinds[i].v; sl.el.min = kinds[i].min; sl.el.max = kinds[i].max; sl.el.step = kinds[i].st; sl.set(par); sl.lab.textContent = kinds[i].lab; draw(); }, 0);
    sl = V.slider(box, kinds[0].lab, kinds[0].min, kinds[0].max, kinds[0].st, par, function (v) { par = v; draw(); }, f2); sl.lab = box.lastChild.firstChild;
    V.slider(box, "number of terms N", 5, 150, 1, N, function (v) { N = v; draw(); }); draw();
  };
  L[9].tip = "For each series ask: do the partial sums settle on a level? Drag the parameter across the boundary (r = 1, p = 1) and watch convergence switch to divergence. The lower graph is exactly what the ratio test looks at.";

  /* mock exam result picture: bars by task */
  V.scoreBars = function (box, perTask, names) {
    var P = Plot(box, { h: 200, label: "mock exam result by task" }), K = V.col(), ts = Object.keys(perTask).sort(function (a, b) { return a - b; });
    P.range(0, ts.length + 1, 0, 1.15); P.clear(); P.axes({ nogrid: false, yl: "share right" });
    ts.forEach(function (t, i) { var v = perTask[t][0] / perTask[t][1], col = v >= 0.99 ? K.ok : v >= 0.5 ? K.b : K.a; P.poly([[i + 0.7, 0], [i + 1.3, 0], [i + 1.3, v], [i + 0.7, v]], col, col, 1); P.text(i + 1, -0.0, "T" + t, K.ink, "center", 0, 12); P.text(i + 1, v, perTask[t][0] + "/" + perTask[t][1], K.ink, "center", 0, -9); });
  };

  V.lab = function (t) {
    if (!L[t]) return null; var box = V.el("div", "vbox"); try { L[t](box); } catch (e) { box.textContent = "The lab could not be drawn on this device."; if (window.console) console.error("lab", t, e); return box; }
    var tip = V.el("div", "vcap"); tip.appendChild(V.el("b", null, "Try this: ")); tip.appendChild(document.createTextNode(L[t].tip || "")); box.appendChild(tip); return box;
  };
})();
