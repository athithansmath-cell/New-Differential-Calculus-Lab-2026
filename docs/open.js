/* open.js - practice mode for any register number (not on the class list).
   Builds a personal problem set in the browser with exact fractions. Same 17 tasks, same visualisers.
   Answers here can be worked out by reading this file, so practice mode is NOT marked and is never
   sent to the live dashboard. Nothing is sent anywhere: all data stays on the student's device. */
(function (root) {
  "use strict";
  var C = root.PassportCore || (typeof require !== "undefined" ? require("./core.js") : null);
  var OPEN_SALT = "open-practice-2026";
  var ELL = [[4, 21, "3/5", "4/5"], [7, 18, "4/5", "3/5"], [7, 32, "3/5", "4/5"], [8, 42, "3/5", "4/5"], [9, 16, "3/5", "4/5"], [10, 25, "3/5", "4/5"], [11, 14, "4/5", "3/5"], [12, 63, "3/5", "4/5"], [14, 11, "3/5", "4/5"], [14, 36, "4/5", "3/5"], [14, 64, "3/5", "4/5"], [16, 9, "4/5", "3/5"], [16, 84, "3/5", "4/5"], [18, 7, "3/5", "4/5"], [18, 32, "3/5", "4/5"], [20, 50, "3/5", "4/5"], [20, 105, "3/5", "4/5"], [21, 4, "4/5", "3/5"], [21, 54, "4/5", "3/5"], [21, 96, "3/5", "4/5"], [22, 28, "4/5", "3/5"], [25, 10, "4/5", "3/5"], [25, 45, "4/5", "3/5"], [25, 80, "3/5", "4/5"], [27, 48, "3/5", "4/5"], [28, 22, "3/5", "4/5"], [28, 72, "4/5", "3/5"], [30, 75, "3/5", "4/5"], [32, 7, "4/5", "3/5"], [32, 18, "4/5", "3/5"], [33, 42, "4/5", "3/5"], [33, 117, "3/5", "4/5"], [34, 85, "8/17", "15/17"], [35, 90, "4/5", "3/5"], [36, 14, "3/5", "4/5"], [36, 64, "3/5", "4/5"], [40, 100, "3/5", "4/5"], [42, 8, "4/5", "3/5"], [42, 33, "3/5", "4/5"], [42, 108, "4/5", "3/5"], [44, 56, "4/5", "3/5"], [45, 25, "3/5", "4/5"], [45, 80, "3/5", "4/5"], [48, 27, "4/5", "3/5"], [50, 20, "4/5", "3/5"], [50, 90, "4/5", "3/5"], [54, 21, "3/5", "4/5"], [54, 96, "3/5", "4/5"], [55, 70, "4/5", "3/5"], [56, 44, "3/5", "4/5"], [63, 12, "4/5", "3/5"], [63, 112, "3/5", "4/5"], [64, 14, "4/5", "3/5"], [64, 36, "4/5", "3/5"], [65, 117, "5/13", "12/13"], [66, 84, "4/5", "3/5"], [70, 55, "3/5", "4/5"], [72, 28, "3/5", "4/5"], [75, 30, "4/5", "3/5"], [77, 98, "4/5", "3/5"], [80, 25, "4/5", "3/5"], [80, 45, "4/5", "3/5"], [84, 16, "4/5", "3/5"], [84, 66, "3/5", "4/5"], [85, 34, "15/17", "8/17"], [88, 112, "4/5", "3/5"], [90, 35, "3/5", "4/5"], [90, 50, "3/5", "4/5"], [96, 21, "4/5", "3/5"], [96, 54, "4/5", "3/5"], [98, 77, "3/5", "4/5"], [100, 40, "4/5", "3/5"], [105, 20, "4/5", "3/5"], [108, 42, "3/5", "4/5"], [112, 63, "4/5", "3/5"], [112, 88, "3/5", "4/5"], [117, 33, "4/5", "3/5"], [117, 65, "12/13", "5/13"]];

  /* ---- exact fractions on BigInt ---- */
  function gcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function Fr(n, d) { n = BigInt(n); d = d === undefined ? 1n : BigInt(d); if (d < 0n) { n = -n; d = -d; } var g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
  function fromStr(s) { var p = String(s).split("/"); return Fr(p[0], p[1] || 1); }
  function add(a, b) { return Fr(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return Fr(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return Fr(a.n * b.n, a.d * b.d); }
  function div(a, b) { return Fr(a.n * b.d, a.d * b.n); }
  function pw(a, k) { var r = Fr(1), i; for (i = 0; i < k; i++) r = mul(r, a); return r; }
  function abs(a) { return Fr(a.n < 0n ? -a.n : a.n, a.d); }
  function cmp(a, b) { var x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; }
  function isqrt(n) { if (n < 2n) return n; var x = BigInt(Math.floor(Math.sqrt(Number(n)))), y; for (;;) { y = (x + n / x) >> 1n; if (y === x || y === x + 1n && y * y > n) break; if (y >= x && x * x <= n && (x + 1n) * (x + 1n) > n) break; x = y; } while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }
  function rsqrt(q) { if (q.n < 0n) return null; var a = isqrt(q.n), b = isqrt(q.d); return a * a === q.n && b * b === q.d ? Fr(a, b) : null; }
  function fs(q) { return q.d === 1n ? q.n.toString() : q.n + "/" + q.d; }
  function canon(q) { return q.n + "/" + q.d; }
  function I(n) { return Fr(n); }

  /* ---- seeded random numbers ---- */
  function rngFor(reg, bump) {
    var h = C.sha256(OPEN_SALT + "|" + reg + "|" + bump), a = parseInt(h.slice(0, 8), 16) >>> 0;
    function next() { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    return { next: next, int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); }, pick: function (arr) { return arr[Math.floor(next() * arr.length)]; } };
  }

  var T_SMALL = [Fr(3, 4), Fr(4, 3), Fr(5, 12), Fr(12, 5)];
  var COSTS = [Fr(1, 2), Fr(-1, 2), Fr(0), Fr(1, 4), Fr(3, 4), Fr(-3, 5), Fr(4, 5), Fr(-1, 3)];
  var SLOPES_M = [Fr(1, 2), Fr(2), Fr(3), Fr(1, 3), Fr(3, 2), Fr(2, 3), Fr(-1, 2), Fr(-2), Fr(-3), Fr(5, 2)];

  function poly3(c) {
    var mons = ["x³", "x²y", "xy²", "y³"], out = "", first = true;
    c.forEach(function (coef, i) {
      if (!coef) return;
      var a = Math.abs(coef), body = a === 1 ? mons[i] : a + mons[i];
      out += first ? (coef < 0 ? "−" : "") + body : (coef < 0 ? " − " : " + ") + body; first = false;
    });
    return out;
  }
  function term(coef, mon, first) {
    if (!coef) return "";
    var a = Math.abs(coef), body = (a === 1 && mon !== "") ? mon : a + mon;
    return first ? (coef < 0 ? "−" : "") + body : (coef < 0 ? " − " : " + ") + body;
  }

  /* returns [{id, period, topic, title, text, answers:[[label, Fraction]], viz}] */
  function raw(reg, bump) {
    var R = rngFor(reg, bump || 0), T = [], a, t, s, w, x0, y0, rho, alpha, beta, cc, base;
    var pick = R.pick, ri = R.int;
    /* P1 */
    a = ri(1, 24); t = pick(T_SMALL.slice(0, 2)); if (R.next() < 0.5) t = Fr(-t.n, t.d);
    w = rsqrt(add(I(1), mul(t, t))); x0 = mul(I(2 * a), t); y0 = mul(I(a), mul(t, t));
    rho = mul(I(2 * a), pw(w, 3)); alpha = mul(I(-2 * a), pw(t, 3)); beta = mul(I(a), add(mul(I(3), mul(t, t)), I(2)));
    cc = sub(add(mul(alpha, alpha), mul(beta, beta)), mul(rho, rho));
    base = "Your personal parabola is x² = " + (4 * a) + "y.  Take the point P(" + fs(x0) + ", " + fs(y0) + ") on it.";
    var pv = { kind: "parab", a: a, x0: fs(x0), y0: fs(y0) };
    T.push({ id: "1.1", period: 1, topic: "Curvature · Cartesian form", title: "Radius of curvature", text: base + "  Find the radius of curvature ρ of the parabola at P.", answers: [["ρ", rho]], viz: pv });
    T.push({ id: "1.2", period: 1, topic: "Circle of curvature · centre", title: "Centre of curvature", text: base + "  Find the centre of curvature (α, β) at P.", answers: [["α", alpha], ["β", beta]], viz: pv });
    T.push({ id: "1.3", period: 1, topic: "Circle of curvature · equation", title: "Your circle of curvature", text: base + "  The circle of curvature at P is x² + y² − 2αx − 2βy + c = 0.  Find the constant c.", answers: [["c", cc]], viz: pv });
    var e = pick(ELL), A = e[0], B = e[1], c = fromStr(e[2]), sn = fromStr(e[3]);
    var wE = rsqrt(add(mul(I(A * A), mul(sn, sn)), mul(I(B * B), mul(c, c))));
    var rhoE = div(pw(wE, 3), I(A * B)), ev = { kind: "ellipse", A: A, B: B, c: fs(c), s: fs(sn) };
    T.push({ id: "1.4", period: 1, topic: "Radius of curvature · parametric form", title: "Your ellipse", text: "Your personal ellipse is x = " + A + "cos θ, y = " + B + "sin θ.  At the point where cos θ = " + fs(c) + " and sin θ = " + fs(sn) + ", find ρ.", answers: [["ρ", rhoE]], viz: ev });
    var b = pick(T_SMALL), k = ri(1, 6), r0 = ri(2, 15);
    T.push({ id: "1.5", period: 1, topic: "Radius of curvature · polar form", title: "Your spiral", text: "Your personal spiral is r = " + k + "·e^(" + fs(b) + "θ).  At the point where r = " + r0 + ", find the radius of curvature ρ.", answers: [["ρ", mul(I(r0), rsqrt(add(I(1), mul(b, b))))]], viz: { kind: "spiral", b: fs(b), k: k, r0: r0 } });
    /* P2 */
    var A2 = I(A), B2 = I(B), d2 = sub(mul(A2, A2), mul(B2, B2));
    var eva = div(mul(d2, pw(c, 3)), A2), evb = div(mul(Fr(-1), mul(d2, pw(sn, 3))), B2);
    T.push({ id: "2.1", period: 2, topic: "Evolute · ellipse", title: "Evolute of your ellipse", text: "Use your ellipse x = " + A + "cos θ, y = " + B + "sin θ again.  The evolute is the locus of centres of curvature.  Find the point (α, β) of the evolute that belongs to the point with cos θ = " + fs(c) + ", sin θ = " + fs(sn) + ".", answers: [["α", eva], ["β", evb]], viz: ev });
    var arc = abs(sub(div(I(A * A), B2), div(I(B * B), A2)));
    T.push({ id: "2.2", period: 2, topic: "Involute / evolute relation", title: "Length along your evolute", text: "Your ellipse is x = " + A + "cos θ, y = " + B + "sin θ.  The ellipse is an involute of its evolute.  Without integrating, find the length of the arc of the evolute between the points that correspond to θ = 0 and θ = π/2.", answers: [["arc length", arc]], viz: ev });
    var ac = ri(1, 12), cost = pick(COSTS), omc = sub(I(1), cost);
    T.push({ id: "2.3", period: 2, topic: "Evolute · cycloid", title: "Your cycloid", text: "Your personal cycloid is x = " + ac + "(t − sin t), y = " + ac + "(1 − cos t).  At the point where cos t = " + fs(cost) + ", find ρ² and the y-coordinate β of the corresponding point on the evolute.", answers: [["ρ²", mul(I(8 * ac * ac), omc)], ["β", mul(I(-ac), omc)]], viz: { kind: "cycloid", a: ac, cost: fs(cost) } });
    var sq = ri(4, 14), rq = ri(1, sq - 1);
    T.push({ id: "2.4", period: 2, topic: "Envelope · one-parameter family", title: "Your envelope of lines", text: "The family of lines x/p + y/q = 1 with p + q = " + (sq * sq) + " has an envelope.  Find the y-coordinate of the point on the envelope whose x-coordinate is " + (rq * rq) + ".", answers: [["y", I((sq - rq) * (sq - rq))]], viz: { kind: "env1", s: sq * sq, r: rq } });
    var cm = ri(1, 9), m = pick(SLOPES_M);
    T.push({ id: "2.5", period: 2, topic: "Envelope · tangent lines", title: "Where your line touches", text: "The lines y = mx + " + cm + "/m (m a parameter) envelope a parabola.  For m = " + fs(m) + ", find the point (x, y) where this line touches the envelope.", answers: [["x", div(I(cm), mul(m, m))], ["y", div(I(2 * cm), m)]], viz: { kind: "env2", c: cm, m: fs(m) } });
    var ca = ri(2, 9), u = pick([Fr(1, 2), Fr(1, 3), Fr(1, 5), Fr(-1, 2), Fr(3, 5), Fr(0), Fr(-1, 3), Fr(1, 4)]), cp = ri(1, 8), tp = pick(T_SMALL.slice(0, 2));
    var pPar = mul(I(cp), rsqrt(add(I(1), mul(tp, tp)))), p2 = div(mul(I(ca * ca), pw(add(I(1), u), 3)), I(2));
    T.push({ id: "2.6", period: 2, topic: "Pedal equation · polar and Cartesian", title: "Two pedal equations", text: "(i) Cardioid r = " + ca + "(1 + cos θ): find p² at the point where cos θ = " + fs(u) + ".   (ii) Parabola y² = " + (4 * cp) + "x, with the pole at the focus: find p at the point (" + fs(mul(I(cp), mul(tp, tp))) + ", " + fs(mul(I(2 * cp), tp)) + ").", answers: [["p² (cardioid)", p2], ["p (parabola)", pPar]], viz: { kind: "pedal", a: ca, u: fs(u), c: cp, t: fs(tp) } });
    /* P3 */
    var co, nz, vals = [-3, -2, -1, 1, 2, 3];
    do { co = [ri(-5, 5), ri(-5, 5), ri(-5, 5), ri(-5, 5)]; nz = co.filter(function (v) { return v; }).length; } while (nz < 3);
    var px = pick(vals), py = pick(vals);
    var fxx = 3 * co[0] * px * px + 2 * co[1] * px * py + co[2] * py * py, fyy = co[1] * px * px + 2 * co[2] * px * py + 3 * co[3] * py * py;
    var fval = co[0] * px * px * px + co[1] * px * px * py + co[2] * px * py * py + co[3] * py * py * py, fn = "f(x, y) = " + poly3(co), pz = { kind: "poly3", co: co, px: px, py: py };
    T.push({ id: "3.1", period: 3, topic: "Partial derivatives", title: "Slopes of your surface", text: "Your personal surface is " + fn + ".  At the point (" + px + ", " + py + ") find ∂f/∂x and ∂f/∂y.", answers: [["∂f/∂x", I(fxx)], ["∂f/∂y", I(fyy)]], viz: pz });
    T.push({ id: "3.2", period: 3, topic: "Euler's theorem · second degree", title: "Euler on your surface", text: "For " + fn + ", find the value of x²·f_xx + 2xy·f_xy + y²·f_yy at (" + px + ", " + py + ").", answers: [["value", I(6 * fval)]], viz: pz });
    var pp = ri(1, 5), qq = ri(1, 5), rr = ri(1, 5), ss = ri(1, 5), jx = pick(vals), jy = pick(vals);
    T.push({ id: "3.3", period: 3, topic: "Jacobian", title: "Your Jacobian", text: "Let u = " + pp + "x² − " + qq + "y and v = " + rr + "xy + " + ss + "x.  Find the Jacobian ∂(u, v)/∂(x, y) at (" + jx + ", " + jy + ").", answers: [["J", I(2 * pp * rr * jx * jx + qq * (rr * jy + ss))]], viz: { kind: "jac", p: pp, q: qq, r: rr, s: ss, x: jx, y: jy } });
    var h = [ri(-3, 3), ri(-3, 3), ri(-3, 3), ri(-3, 3), ri(-3, 3), ri(-3, 3), ri(-3, 3)]; if (h[1] === 0) h[1] = 2;
    var ta = pick([-2, -1, 1, 2]), tb = pick([-2, -1, 1, 2]), mons = ["x³", "x²y", "xy²", "y³", "x²", "xy", "y²"], hs = "", first = true;
    h.forEach(function (coef, i) { var piece = term(coef, mons[i], first); if (piece) { hs += piece; first = false; } });
    var cxx = 3 * h[0] * ta + h[1] * tb + h[4], cxy = 2 * h[1] * ta + 2 * h[2] * tb + h[5];
    var tx = "Expand h(x, y) = " + hs + " in a Taylor series about (" + ta + ", " + tb + ").  Find the coefficient of (x − " + ta + ")² and the coefficient of (x − " + ta + ")(y − " + tb + ").";
    tx = tx.replace("(x − -", "(x + ").replace("(y − -", "(y + ").replace("(x − -", "(x + ").replace("(y − -", "(y + ");
    T.push({ id: "3.4", period: 3, topic: "Taylor series · two variables", title: "Your Taylor expansion", text: tx, answers: [["coeff of (x−a)²", I(cxx)], ["coeff of (x−a)(y−b)", I(cxy)]], viz: { kind: "taylor", h: h, a: ta, b: tb } });
    var al = ri(1, 3), be = ri(1, 3), pe = ri(1, 4), qe = ri(1, 4), K = ri(1, 9), S = 2 * al * pe * pe * pe + 2 * be * qe * qe * qe;
    T.push({ id: "3.5", period: 3, topic: "Extrema of two variables", title: "Peaks and pits of your surface", text: "Your surface is g(x, y) = " + al + "x³ + " + be + "y³ − " + (3 * al * pe * pe) + "x − " + (3 * be * qe * qe) + "y + " + K + ".  Find its local minimum value and its local maximum value.", answers: [["local minimum", I(K - S)], ["local maximum", I(K + S)]], viz: { kind: "surface", al: al, be: be, p: pe, q: qe, K: K } });
    var LA = ri(1, 7), LB = ri(1, 7), LC = ri(1, 9), den = LA * LA + LB * LB;
    T.push({ id: "3.6", period: 3, topic: "Lagrange multipliers", title: "Closest point to the origin", text: "Use Lagrange's method to minimise x² + y² subject to " + LA + "x + " + LB + "y = " + LC + ".  Give the minimum value and the x-coordinate where it occurs.", answers: [["minimum value", Fr(LC * LC, den)], ["x", Fr(LA * LC, den)]], viz: { kind: "lagr", A: LA, B: LB, C: LC } });
    return T;
  }

  /* public: tasks in the same shape as data.js (hashed answers, practice salt) */
  function make(regno) {
    return raw(regno, 0).map(function (t) {
      return { id: t.id, period: t.period, topic: t.topic, title: t.title, text: t.text, viz: t.viz,
        answers: t.answers.map(function (a, i) { return { label: a[0], h: C.answerHash(OPEN_SALT, regno, t.id, i, canon(a[1])) }; }) };
    });
  }
  function validReg(r) { return /^[A-Z0-9][A-Z0-9._-]{3,29}$/.test(r); }

  var api = { OPEN_SALT: OPEN_SALT, make: make, raw: raw, canon: canon, validReg: validReg };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PassportOpen = api;
})(typeof window !== "undefined" ? window : globalThis);
