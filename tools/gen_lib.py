"""Task library for the Calculus Passport activity.

Every task has exact rational answers (fractions.Fraction).  Parameters are
chosen so that all square roots that appear are rational, so a student can
finish with pen and paper and no calculator tricks.
"""
import hashlib
import random
from fractions import Fraction as F
from math import isqrt

# rational points on the unit circle (cos, sin) and Pythagorean slopes t (1+t^2 is a square)
TRIPLES = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (20, 21, 29)]
T_SLOPES = []
for p, q, r in TRIPLES:
    T_SLOPES += [F(p, q), F(q, p)]
T_SMALL = [F(3, 4), F(4, 3), F(5, 12), F(12, 5)]   # keeps denominators hand-friendly
CIRCLE_PTS = []
for p, q, r in TRIPLES:
    CIRCLE_PTS += [(F(p, r), F(q, r)), (F(q, r), F(p, r))]


def rsqrt(q):
    """exact rational square root, or None"""
    q = F(q)
    if q < 0:
        return None
    n, d = isqrt(q.numerator), isqrt(q.denominator)
    if n * n == q.numerator and d * d == q.denominator:
        return F(n, d)
    return None


def fs(q):
    """format a Fraction for statements"""
    q = F(q)
    return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"


def sgn(n):
    return "+" if n >= 0 else "−"


def seeded_rng(salt, regno, bump=0):
    h = hashlib.sha256(f"{salt}|{regno}|{bump}".encode()).hexdigest()
    return random.Random(int(h[:16], 16))


def poly3(c):
    """homogeneous cubic string from [A,B,C,D]"""
    terms = []
    for coef, mon in zip(c, ["x³", "x²y", "xy²", "y³"]):
        if coef == 0:
            continue
        a = abs(coef)
        body = (mon if a == 1 else f"{a}{mon}")
        terms.append((coef < 0, body))
    out = ""
    for i, (neg, body) in enumerate(terms):
        out += ("−" if neg else "") + body if i == 0 else (" − " if neg else " + ") + body
    return out


def _ellipses():
    out = []
    for A in range(2, 121):
        for B in range(2, 121):
            if A == B:
                continue
            for (c, sn) in CIRCLE_PTS[:6]:
                w_ = rsqrt(A * A * sn * sn + B * B * c * c)
                if w_ is None:
                    continue
                vals = [w_ ** 3 / (A * B), (A * A - B * B) * c ** 3 / A, (A * A - B * B) * sn ** 3 / B, F(A * A, B) - F(B * B, A)]
                if max(v.denominator for v in vals) <= 300:
                    out.append((A, B, c, sn))
    return out


ELLIPSES = _ellipses()


COSTS = [F(1, 2), F(-1, 2), F(0), F(1, 4), F(3, 4), F(-3, 5), F(4, 5), F(-1, 3)]
SLOPES_M = [F(1, 2), F(2), F(3), F(1, 3), F(3, 2), F(2, 3), F(-1, 2), F(-2), F(-3), F(5, 2)]
OPTIONS = {
    "P1a": [(a, t * sg) for a in range(1, 25) for t in T_SMALL[:2] for sg in (1, -1)],
    "P1b": ELLIPSES,
    "P1c": [(b, k, r0) for b in T_SMALL for k in range(1, 7) for r0 in range(2, 16)],
    "P2a": [(ac, ct) for ac in range(1, 13) for ct in COSTS],
    "P2b": [(sq, rq) for sq in range(4, 15) for rq in range(1, sq)],
    "P2c": [(cm, mm) for cm in range(1, 10) for mm in SLOPES_M],
    "P3d": [(al, be, pe, qe, K) for al in range(1, 4) for be in range(1, 4) for pe in range(1, 5) for qe in range(1, 5) for K in range(1, 10)],
    "P3e": [(LA, LB, LC) for LA in range(1, 8) for LB in range(1, 8) for LC in range(1, 10)],
}


def _perm(name, salt):
    n = len(OPTIONS[name])
    order = list(range(n))
    random.Random(int(hashlib.sha256(f"{salt}|perm|{name}".encode()).hexdigest()[:16], 16)).shuffle(order)
    return order


def make_student(regno, salt, bump=0, index=None):
    """index = position of the student in the roster: gives every student a different variant of the
    small-pool families (parabola, ellipse, spiral, cycloid, envelopes, extrema, Lagrange)."""
    perms = {}

    def sel(name):
        if index is None:
            return rng.choice(OPTIONS[name])
        if name not in perms:
            perms[name] = _perm(name, salt)
        return OPTIONS[name][perms[name][index % len(perms[name])]]

    rng = seeded_rng(salt, regno, bump)
    tasks = []
    fp = {}  # fingerprint of the parameters, used to guarantee uniqueness

    # ------------------------------------------------------------------ PERIOD 1
    a, t = sel("P1a")
    s = 1 + t * t
    w = rsqrt(s)
    x0, y0 = 2 * a * t, a * t * t
    rho = 2 * a * w ** 3
    alpha, beta = -2 * a * t ** 3, a * (3 * t * t + 2)
    cc = alpha ** 2 + beta ** 2 - rho ** 2
    fp["P1a"] = (a, t)
    base = f"Your personal parabola is x² = {4*a}y.  Take the point P({fs(x0)}, {fs(y0)}) on it."
    tasks.append(dict(id="1.1", period=1, topic="Curvature · Cartesian form",
        title="Radius of curvature",
        text=base + "  Find the radius of curvature ρ of the parabola at P.",
        answers=[("ρ", rho)]))
    tasks.append(dict(id="1.2", period=1, topic="Circle of curvature · centre",
        title="Centre of curvature",
        text=base + "  Find the centre of curvature (α, β) at P.",
        answers=[("α", alpha), ("β", beta)],
        viz=dict(kind="parab", a=a, x0=fs(x0), y0=fs(y0))))
    tasks.append(dict(id="1.3", period=1, topic="Circle of curvature · equation",
        title="Your circle of curvature",
        text=base + "  The circle of curvature at P is x² + y² − 2αx − 2βy + c = 0.  Find the constant c.",
        answers=[("c", cc)]))

    # ellipse, parametric form (variants precomputed in ELLIPSES)
    A, B, c, sn = sel("P1b")
    rho_e = rsqrt(A * A * sn * sn + B * B * c * c) ** 3 / (A * B)
    fp["P1b"] = (A, B, c, sn)
    tasks.append(dict(id="1.4", period=1, topic="Radius of curvature · parametric form",
        title="Your ellipse",
        text=f"Your personal ellipse is x = {A}cos θ, y = {B}sin θ.  At the point where cos θ = {fs(c)} and sin θ = {fs(sn)}, find ρ.",
        answers=[("ρ", rho_e)]))

    # equiangular spiral, polar form
    b, k, r0 = sel("P1c")
    rho_s = r0 * rsqrt(1 + b * b)
    fp["P1c"] = (b, k, r0)
    tasks.append(dict(id="1.5", period=1, topic="Radius of curvature · polar form",
        title="Your spiral",
        text=f"Your personal spiral is r = {k}·e^({fs(b)}θ).  At the point where r = {r0}, find the radius of curvature ρ.",
        answers=[("ρ", rho_s)]))

    # ------------------------------------------------------------------ PERIOD 2
    # evolute of the same ellipse (centre of curvature at the same point)
    ev_a = (A * A - B * B) * c ** 3 / A
    ev_b = -(A * A - B * B) * sn ** 3 / B
    tasks.append(dict(id="2.1", period=2, topic="Evolute · ellipse",
        title="Evolute of your ellipse",
        text=f"Use your ellipse x = {A}cos θ, y = {B}sin θ again.  The evolute is the locus of centres of curvature.  "
             f"Find the point (α, β) of the evolute that belongs to the point with cos θ = {fs(c)}, sin θ = {fs(sn)}.",
        answers=[("α", ev_a), ("β", ev_b)],
        viz=dict(kind="ellipse", A=A, B=B, c=fs(c), s=fs(sn))))
    arc = abs(F(A * A, B) - F(B * B, A))
    tasks.append(dict(id="2.2", period=2, topic="Involute / evolute relation",
        title="Length along your evolute",
        text=f"Your ellipse is x = {A}cos θ, y = {B}sin θ.  The ellipse is an involute of its evolute.  "
             f"Without integrating, find the length of the arc of the evolute between the points that correspond to θ = 0 and θ = π/2.",
        answers=[("arc length", arc)]))
    ac, cost = sel("P2a")
    rho2 = 8 * ac * ac * (1 - cost)
    beta_c = -ac * (1 - cost)
    fp["P2a"] = (ac, cost)
    tasks.append(dict(id="2.3", period=2, topic="Evolute · cycloid",
        title="Your cycloid",
        text=f"Your personal cycloid is x = {ac}(t − sin t), y = {ac}(1 − cos t).  At the point where cos t = {fs(cost)}, find ρ² "
             f"and the y-coordinate β of the corresponding point on the evolute.",
        answers=[("ρ²", rho2), ("β", beta_c)]))
    sq, rq = sel("P2b")
    fp["P2b"] = (sq, rq)
    tasks.append(dict(id="2.4", period=2, topic="Envelope · one-parameter family",
        title="Your envelope of lines",
        text=f"The family of lines x/p + y/q = 1 with p + q = {sq*sq} has an envelope.  Find the y-coordinate of the point on the envelope whose x-coordinate is {rq*rq}.",
        answers=[("y", F((sq - rq) ** 2))]))
    cm, m = sel("P2c")
    fp["P2c"] = (cm, m)
    tasks.append(dict(id="2.5", period=2, topic="Envelope · tangent lines",
        title="Where your line touches",
        text=f"The lines y = mx + {cm}/m (m a parameter) envelope a parabola.  For m = {fs(m)}, find the point (x, y) where this line touches the envelope.",
        answers=[("x", F(cm) / (m * m)), ("y", F(2 * cm) / m)]))
    ca = rng.randint(2, 9)
    u = rng.choice([F(1, 2), F(1, 3), F(1, 5), F(-1, 2), F(3, 5), F(0), F(-1, 3), F(1, 4)])
    cp = rng.randint(1, 8)
    tp = rng.choice(T_SMALL[:2])
    p_par = cp * rsqrt(1 + tp * tp)
    p2_card = ca * ca * (1 + u) ** 3 / 2
    fp["P2d"] = (ca, u, cp, tp)
    tasks.append(dict(id="2.6", period=2, topic="Pedal equation · polar and Cartesian",
        title="Two pedal equations",
        text=f"(i) Cardioid r = {ca}(1 + cos θ): find p² at the point where cos θ = {fs(u)}.   "
             f"(ii) Parabola y² = {4*cp}x, with the pole at the focus: find p at the point ({fs(cp*tp*tp)}, {fs(2*cp*tp)}).",
        answers=[("p² (cardioid)", p2_card), ("p (parabola)", p_par)]))

    # ------------------------------------------------------------------ PERIOD 3
    while True:
        co = [rng.randint(-5, 5) for _ in range(4)]
        if sum(1 for v in co if v) >= 3:
            break
    px, py = rng.choice([-3, -2, -1, 1, 2, 3]), rng.choice([-3, -2, -1, 1, 2, 3])
    fxx = 3 * co[0] * px * px + 2 * co[1] * px * py + co[2] * py * py
    fyy = co[1] * px * px + 2 * co[2] * px * py + 3 * co[3] * py * py
    fval = co[0] * px ** 3 + co[1] * px * px * py + co[2] * px * py * py + co[3] * py ** 3
    fp["P3a"] = (tuple(co), px, py)
    fn = f"f(x, y) = {poly3(co)}"
    tasks.append(dict(id="3.1", period=3, topic="Partial derivatives",
        title="Slopes of your surface",
        text=f"Your personal surface is {fn}.  At the point ({px}, {py}) find ∂f/∂x and ∂f/∂y.",
        answers=[("∂f/∂x", F(fxx)), ("∂f/∂y", F(fyy))]))
    tasks.append(dict(id="3.2", period=3, topic="Euler's theorem · second degree",
        title="Euler on your surface",
        text=f"For {fn}, find the value of x²·f_xx + 2xy·f_xy + y²·f_yy at ({px}, {py}).",
        answers=[("value", F(6 * fval))]))
    pp, qq, rr, ss = (rng.randint(1, 5) for _ in range(4))
    jx, jy = rng.choice([-3, -2, -1, 1, 2, 3]), rng.choice([-3, -2, -1, 1, 2, 3])
    jac = 2 * pp * rr * jx * jx + qq * (rr * jy + ss)
    fp["P3b"] = (pp, qq, rr, ss, jx, jy)
    tasks.append(dict(id="3.3", period=3, topic="Jacobian",
        title="Your Jacobian",
        text=f"Let u = {pp}x² − {qq}y and v = {rr}xy + {ss}x.  Find the Jacobian ∂(u, v)/∂(x, y) at ({jx}, {jy}).",
        answers=[("J", F(jac))]))
    h = [rng.randint(-3, 3) for _ in range(7)]  # a1 b1 c1 d1 e f g
    if h[1] == 0:
        h[1] = 2
    ta, tb = rng.choice([-2, -1, 1, 2]), rng.choice([-2, -1, 1, 2])
    a1, b1, c1, d1, e1, f1, g1 = h

    def term(coef, mon, first):
        if coef == 0:
            return ""
        a_ = abs(coef)
        body = mon if (a_ == 1 and mon != "") else f"{a_}{mon}"
        return (("−" if coef < 0 else "") if first else (" − " if coef < 0 else " + ")) + body

    mons = ["x³", "x²y", "xy²", "y³", "x²", "xy", "y²"]
    hs, first = "", True
    for coef, mon in zip(h, mons):
        piece = term(coef, mon, first)
        if piece:
            hs += piece
            first = False
    cxx = 3 * a1 * ta + b1 * tb + e1
    cxy = 2 * b1 * ta + 2 * c1 * tb + f1
    fp["P3c"] = (tuple(h), ta, tb)
    tasks.append(dict(id="3.4", period=3, topic="Taylor series · two variables",
        title="Your Taylor expansion",
        text=f"Expand h(x, y) = {hs} in a Taylor series about ({ta}, {tb}).  Find the coefficient of (x − {ta})² and the coefficient of (x − {ta})(y − {tb}).".replace("(x − -", "(x + ").replace("(y − -", "(y + "),
        answers=[("coeff of (x−a)²", F(cxx)), ("coeff of (x−a)(y−b)", F(cxy))]))
    al, be, pe, qe, K = sel("P3d")
    S = 2 * al * pe ** 3 + 2 * be * qe ** 3
    fp["P3d"] = (al, be, pe, qe, K)
    tasks.append(dict(id="3.5", period=3, topic="Extrema of two variables",
        title="Peaks and pits of your surface",
        text=f"Your surface is g(x, y) = {al}x³ + {be}y³ − {3*al*pe*pe}x − {3*be*qe*qe}y + {K}.  Find its local minimum value and its local maximum value.",
        answers=[("local minimum", F(K - S)), ("local maximum", F(K + S))],
        viz=dict(kind="surface", al=al, be=be, p=pe, q=qe, K=K)))
    LA, LB, LC = sel("P3e")
    den = LA * LA + LB * LB
    fp["P3e"] = (LA, LB, LC)
    tasks.append(dict(id="3.6", period=3, topic="Lagrange multipliers",
        title="Closest point to the origin",
        text=f"Use Lagrange's method to minimise x² + y² subject to {LA}x + {LB}y = {LC}.  Give the minimum value and the x-coordinate where it occurs.",
        answers=[("minimum value", F(LC * LC, den)), ("x", F(LA * LC, den))]))
    return tasks, fp
