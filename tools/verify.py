#!/usr/bin/env python3
"""Check student submission files against the private answer key.

    python3 tools/verify.py submissions/*.txt            # prints a table
    python3 tools/verify.py submissions/*.txt --csv marks.csv

For every file it checks
  * each ANSWER line against private/answer_key.csv
  * each STAMP (a stamp can only be produced from the true answers)
  * the length of the written working per task
  * working text that is identical in two different students' files (copying)
"""
import argparse
import csv
import hashlib
import os
import re
import sys
from collections import defaultdict
from fractions import Fraction as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_WORK = 25


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def load_key(path):
    key = defaultdict(dict)  # regno -> {"1.1:0": Fraction}
    counters = defaultdict(int)
    for r in csv.DictReader(open(path, encoding="utf-8")):
        k = (r["regno"], r["task"])
        i = counters[k]
        counters[k] += 1
        n, _, d = r["answer"].partition("/")
        key[r["regno"]][f"{r['task']}:{i}"] = F(int(n), int(d or 1))
    return key


def stamp(salt, regno, period, entries):
    h = sha(f"{salt}|{regno}|stamp|{period}|{','.join(sorted(entries))}")[:8].upper()
    return h[:4] + "-" + h[4:]


def parse(path):
    txt = open(path, encoding="utf-8").read()
    reg = re.search(r"^Register number:\s*(\S+)", txt, re.M)
    stamps = dict(re.findall(r"^STAMP P(\d)\s+([0-9A-F]{4}-[0-9A-F]{4})", txt, re.M))
    answers = dict(re.findall(r"^ANSWER (\d\.\d:\d) = (-?\d+/\d+)", txt, re.M))
    work = {}
    for m in re.finditer(r"^TASK (\d\.\d) \|.*?\nWORKING:\n(.*?)(?=\nTASK |\nBONUS PROBLEM:)", txt, re.M | re.S):
        work[m.group(1)] = m.group(2).strip()
    bonus = re.search(r"BONUS PROBLEM:\n(.*)", txt, re.S)
    return (reg.group(1).upper() if reg else None), stamps, answers, work, (bonus.group(1).strip() if bonus else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--key", default=os.path.join(ROOT, "private", "answer_key.csv"))
    ap.add_argument("--salt", default=os.path.join(ROOT, "private", "salt.txt"))
    ap.add_argument("--csv")
    a = ap.parse_args()
    key = load_key(a.key)
    salt = open(a.salt).read().strip()
    rows, seen = [], defaultdict(list)
    for f in a.files:
        reg, stamps, answers, work, bonus = parse(f)
        if reg not in key:
            print(f"!! {os.path.basename(f)}: register number {reg} not in the answer key")
            continue
        total = len(key[reg])
        right = sum(1 for k, v in answers.items() if k in key[reg] and F(*map(int, v.split("/"))) == key[reg][k])
        wrong = sum(1 for k, v in answers.items() if k not in key[reg] or F(*map(int, v.split("/"))) != key[reg][k])
        stamp_ok = []
        for p in "123":
            ents = [f"{k}={v}" for k, v in answers.items() if k.startswith(p + ".")]
            stamp_ok.append(stamps.get(p) == stamp(salt, reg, int(p), ents))
        thin = sorted(t for t, w in work.items() if len(re.sub(r"\s+", " ", w)) < MIN_WORK and w != "(none)" or w == "(none)")
        thin = [t for t in thin if any(k.startswith(t + ":") for k in answers)]
        for t, w in work.items():
            norm = re.sub(r"\W+", "", w.lower())
            if len(norm) >= 40:
                seen[sha(norm)].append((reg, t))
        rows.append(dict(regno=reg, correct=right, total=total, forged_or_wrong=wrong, stamps_valid="".join("Y" if s else "N" for s in stamp_ok),
                         thin_working=" ".join(thin), bonus="yes" if bonus and bonus != "(none)" else ""))
    copies = [v for v in seen.values() if len({r for r, _ in v}) > 1]
    print(f"{'regno':<18}{'correct':>9}{'wrong':>7}  stamps  thin-working  bonus")
    for r in rows:
        print(f"{r['regno']:<18}{r['correct']:>4}/{r['total']:<4}{r['forged_or_wrong']:>7}  {r['stamps_valid']:^6}  {r['thin_working'] or '-':<12}  {r['bonus']}")
    if copies:
        print("\nIdentical written working in different students' files (check for copying):")
        for grp in copies:
            print("  ", ", ".join(f"{r} task {t}" for r, t in grp))
    else:
        print("\nNo identical working text found across students.")
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        print("wrote", a.csv)


if __name__ == "__main__":
    main()
