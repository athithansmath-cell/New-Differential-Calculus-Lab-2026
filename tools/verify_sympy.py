#!/usr/bin/env python3
"""Independent check of every answer, using sympy calculus (no shortcut formulas).

    python3 tools/verify_sympy.py            # checks 300 random students
    python3 tools/verify_sympy.py roster.csv # checks the real roster
"""
import os
import sys
from fractions import Fraction as F

import mpmath as mp
import sympy as sp

sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import make_student  # noqa: E402

mp.mp.dps = 30
SALT = "verify"
TOL = mp.mpf("1e-18")
x, y, th, tt, p, m, r = sp.symbols("x y th tt p m r", real=True)


def S(q):
    q = F(q)
    return sp.Rational(q.numerator, q.denominator)


def close(a, b):
    return abs(mp.mpf(a) - mp.mpf(b)) < TOL * max(1, abs(mp.mpf(b)))


def curv_cart(yexpr, x0):
    y1, y2 = sp.diff(yexpr, x), sp.diff(yexpr, x, 2)
    X, Y = x, yexpr
    rho = (1 + y1 ** 2) ** sp.Rational(3, 2) / sp.Abs(y2)
    al = X - y1 * (1 + y1 ** 2) / y2
    be = Y + (1 + y1 ** 2) / y2
    return [sp.N(e.subs(x, x0), 30) for e in (rho, al, be)]


def curv_param(X, Y, var, v0):
    x1, y1, x2, y2 = (sp.diff(X, var), sp.diff(Y, var), sp.diff(X, var, 2), sp.diff(Y, var, 2))
    den = x1 * y2 - y1 * x2
    rho = (x1 ** 2 + y1 ** 2) ** sp.Rational(3, 2) / sp.Abs(den)
    al = X - y1 * (x1 ** 2 + y1 ** 2) / den
    be = Y + x1 * (x1 ** 2 + y1 ** 2) / den
    return [sp.N(e.subs(var, v0), 30) for e in (rho, al, be)], (al, be)


def load_key(path):
    import csv
    key = {}
    for r in csv.DictReader(open(path, encoding="utf-8")):
        n, _, d = r["answer"].partition("/")
        key.setdefault(r["regno"], []).append(F(int(n), int(d or 1)))
    return key


def check(regno, salt=SALT, key=None, index=None):
    bad = []
    tasks, fp = make_student(regno, salt, 0, index)
    if key is not None:  # find the draw that produced the deployed key (generate.py re-draws on duplicates)
        for bump in range(200):
            tasks, fp = make_student(regno, salt, bump, index)
            if [v for t in tasks for _, v in t["answers"]] == key[regno]:
                break
        else:
            return [(regno, "key", 0, "deployed answer key is not reproducible from the generator", "")]
    ans = {t["id"]: [v for _, v in t["answers"]] for t in tasks}

    def cmp(tid, got):
        for i, (g, e) in enumerate(zip(got, ans[tid])):
            if not close(g, mp.mpf(e.numerator) / e.denominator):
                bad.append((regno, tid, i, str(g), str(e)))

    # ---- period 1
    a, t = fp["P1a"]
    x0 = 2 * a * S(t)
    rho, al, be = curv_cart(x ** 2 / (4 * a), x0)
    cmp("1.1", [rho]); cmp("1.2", [al, be])
    y0 = x0 ** 2 / (4 * a)
    cmp("1.3", [al ** 2 + be ** 2 - rho ** 2])  # circle: x²+y²−2αx−2βy+c=0, c=α²+β²−ρ²
    # circle must pass through P and be tangent: check P on the circle
    c_ = al ** 2 + be ** 2 - rho ** 2
    assert abs(sp.N(x0 ** 2 + y0 ** 2 - 2 * al * x0 - 2 * be * y0 + c_, 30)) < 1e-15
    A, B, c, sn = fp["P1b"]
    th0 = mp.acos(mp.mpf(c.numerator) / c.denominator)
    (rho_e, al_e, be_e), (ale, bee) = curv_param(A * sp.cos(th), B * sp.sin(th), th, sp.N(th0, 30))
    cmp("1.4", [rho_e]); cmp("2.1", [al_e, be_e])
    # 2.2  length of the evolute between theta=0 and pi/2 by numerical integration
    dal, dbe = sp.lambdify(th, sp.diff(ale, th), "mpmath"), sp.lambdify(th, sp.diff(bee, th), "mpmath")
    arc = mp.quad(lambda u: mp.sqrt(dal(u) ** 2 + dbe(u) ** 2), [0, mp.pi / 2])
    if not close(arc, mp.mpf(ans["2.2"][0].numerator) / ans["2.2"][0].denominator):
        # quad on a cusp-ended curve can be slightly off; allow 1e-12
        if abs(arc - mp.mpf(ans["2.2"][0].numerator) / ans["2.2"][0].denominator) > mp.mpf("1e-12"):
            bad.append((regno, "2.2", 0, str(arc), str(ans["2.2"][0])))
    b, k, r0 = fp["P1c"]
    R = k * sp.exp(S(b) * th)
    r1, r2 = sp.diff(R, th), sp.diff(R, th, 2)
    rho_s = (R ** 2 + r1 ** 2) ** sp.Rational(3, 2) / sp.Abs(R ** 2 + 2 * r1 ** 2 - R * r2)
    th_s = sp.log(sp.Rational(r0, k)) / S(b)
    cmp("1.5", [sp.N(rho_s.subs(th, th_s), 30)])
    # ---- period 2
    ac, cost = fp["P2a"]
    t0 = sp.N(sp.acos(S(cost)), 30)
    (rho_c, _, _), (alc, bec) = curv_param(ac * (tt - sp.sin(tt)), ac * (1 - sp.cos(tt)), tt, t0)
    cmp("2.3", [rho_c ** 2, bec.subs(tt, t0)])
    sq, rq = fp["P2b"]
    q = sq * sq - p
    Fp = x / p + y / q - 1
    sol = sp.solve([Fp, sp.diff(Fp, p)], [x, y], dict=True)[0]
    xs, ys = sol[x], sol[y]
    pr = mp.findroot(sp.lambdify(p, xs - rq * rq, "mpmath"), (sq * sq) * mp.mpf(1) / 4 if rq * 2 < sq else sq * sq * 0.5)
    got = sp.lambdify(p, ys, "mpmath")(pr)
    cmp("2.4", [got])
    cm, mm = fp["P2c"]
    Fm = y - m * x - cm / m
    sol = sp.solve([Fm, sp.diff(Fm, m)], [x, y], dict=True)[0]
    cmp("2.5", [sol[x].subs(m, S(mm)), sol[y].subs(m, S(mm))])
    ca, u, cp, tp = fp["P2d"]
    # cardioid: p = r sin(phi), tan(phi) = r / (dr/dtheta); foot-of-perpendicular check
    Rc = ca * (1 + sp.cos(th))
    th_c = sp.N(sp.acos(S(u)), 30)
    rr_, dr_ = Rc.subs(th, th_c), sp.diff(Rc, th).subs(th, th_c)
    pc = rr_ * sp.sin(sp.atan2(rr_, dr_))
    cmp("2.6", [pc ** 2])
    # parabola y²=4 cp x, focus (cp,0), tangent at P(cp t², 2 cp t): distance from focus to tangent
    px_, py_ = cp * S(tp) ** 2, 2 * cp * S(tp)
    slope = sp.diff(sp.sqrt(4 * cp * x), x).subs(x, px_)
    line = py_ - slope * px_
    dist = abs(slope * cp - 0 + line) / sp.sqrt(slope ** 2 + 1)
    if not close(sp.N(dist, 30), mp.mpf(ans["2.6"][1].numerator) / ans["2.6"][1].denominator):
        bad.append((regno, "2.6", 1, str(dist), str(ans["2.6"][1])))
    # ---- period 3
    co, px, py = fp["P3a"]
    f = co[0] * x ** 3 + co[1] * x ** 2 * y + co[2] * x * y ** 2 + co[3] * y ** 3
    pt = {x: px, y: py}
    cmp("3.1", [sp.diff(f, x).subs(pt), sp.diff(f, y).subs(pt)])
    cmp("3.2", [(x ** 2 * sp.diff(f, x, 2) + 2 * x * y * sp.diff(f, x, y) + y ** 2 * sp.diff(f, y, 2)).subs(pt)])
    pp, qq, rr, ss, jx, jy = fp["P3b"]
    u_, v_ = pp * x ** 2 - qq * y, rr * x * y + ss * x
    cmp("3.3", [sp.Matrix([u_, v_]).jacobian([x, y]).det().subs({x: jx, y: jy})])
    h, ta, tb = fp["P3c"]
    hh = h[0] * x ** 3 + h[1] * x ** 2 * y + h[2] * x * y ** 2 + h[3] * y ** 3 + h[4] * x ** 2 + h[5] * x * y + h[6] * y ** 2
    X_, Y_ = sp.symbols("X_ Y_")
    ex = sp.expand(hh.subs({x: X_ + ta, y: Y_ + tb}))
    cmp("3.4", [ex.coeff(X_, 2).coeff(Y_, 0), ex.coeff(X_, 1).coeff(Y_, 1)])
    al3, be3, pe, qe, K = fp["P3d"]
    g = al3 * x ** 3 + be3 * y ** 3 - 3 * al3 * pe ** 2 * x - 3 * be3 * qe ** 2 * y + K
    crit = sp.solve([sp.diff(g, x), sp.diff(g, y)], [x, y], dict=True)
    mins, maxs = [], []
    for cpnt in crit:
        H = sp.hessian(g, (x, y)).subs(cpnt)
        D = H.det()
        if D > 0 and H[0, 0] > 0:
            mins.append(g.subs(cpnt))
        elif D > 0 and H[0, 0] < 0:
            maxs.append(g.subs(cpnt))
    assert len(mins) == 1 and len(maxs) == 1
    cmp("3.5", [mins[0], maxs[0]])
    LA, LB, LC = fp["P3e"]
    lam = sp.symbols("lam")
    L = x ** 2 + y ** 2 - lam * (LA * x + LB * y - LC)
    s3 = sp.solve([sp.diff(L, x), sp.diff(L, y), LA * x + LB * y - LC], [x, y, lam], dict=True)[0]
    cmp("3.6", [(x ** 2 + y ** 2).subs(s3), s3[x]])
    return bad


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if len(sys.argv) > 1:
        import csv
        regs = ["".join(r[0].split()).upper() for r in csv.reader(open(sys.argv[1], encoding="utf-8-sig"))
                if r and r[0].strip().lower() not in ("regno", "register number", "register_no")]
        salt = open(os.path.join(root, "private", "salt.txt")).read().strip()
        key = load_key(os.path.join(root, "private", "answer_key.csv"))
        allbad = []
        for i, rg in enumerate(regs):
            allbad += check(rg, salt, key, i)
        mode = "against the DEPLOYED answer key"
    else:
        regs = [f"CHK{i:04d}" for i in range(300)]
        allbad = []
        for rg in regs:
            allbad += check(rg)
        mode = "random test students"
    print(f"checked {len(regs)} students ({mode}), 17 tasks and 26 answers each")
    if allbad:
        print("MISMATCHES:", len(allbad))
        for b in allbad[:20]:
            print(b)
        sys.exit(1)
    print("ALL ANSWERS MATCH the independent sympy computation")
