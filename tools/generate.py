#!/usr/bin/env python3
"""Generate the personalised Calculus Passport for every student.

    python3 tools/generate.py roster.csv            # roster.csv: register number[,name]
    python3 tools/generate.py --demo 70             # 70 fake students, for a dry run

Writes
    docs/data.js                  PUBLIC  - problems + hashed answers (safe to push)
    private/answer_key.csv        PRIVATE - every answer for every student (never push)
    private/worksheets.txt        PRIVATE - printable per-student problem sheets
"""
import argparse
import csv
import hashlib
import json
import os
import secrets
import sys
from fractions import Fraction as F

sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import make_student  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def norm_reg(r):
    return "".join(r.split()).upper()


def ans_hash(salt, regno, tid, i, q):
    q = F(q)
    return sha(f"{salt}|{regno}|{tid}|{i}|{q.numerator}/{q.denominator}")[:16]


def read_roster(path):
    out = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.reader(fh):
            if not row or not row[0].strip() or row[0].strip().lower() in ("regno", "register number", "register_no"):
                continue
            out.append((norm_reg(row[0]), row[1].strip() if len(row) > 1 else ""))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roster", nargs="?")
    ap.add_argument("--demo", type=int)
    ap.add_argument("--course", default="Calculus Passport")
    a = ap.parse_args()
    if a.demo:
        roster = [(f"RA25{1000 + i}", f"Student {i + 1}") for i in range(a.demo)]
    elif a.roster:
        roster = read_roster(a.roster)
    else:
        ap.error("give a roster.csv or --demo N")

    os.makedirs(os.path.join(ROOT, "private"), exist_ok=True)
    salt_path = os.path.join(ROOT, "private", "salt.txt")
    if os.path.exists(salt_path):
        salt = open(salt_path).read().strip()
    else:
        salt = secrets.token_hex(8)
        open(salt_path, "w").write(salt)

    students, key_rows, sheets, seen = {}, [], [], set()
    dup = 0
    for idx, (regno, name) in enumerate(roster):
        bump = 0
        while True:
            tasks, fp = make_student(regno, salt, bump, idx)
            tag = json.dumps(fp, sort_keys=True, default=str)
            if tag not in seen:
                seen.add(tag)
                break
            bump += 1
            dup += 1
        sk = sha(f"{salt}|{regno}")[:12]
        pub = []
        sheets.append(f"=== {regno}  {name} ===")
        for t in tasks:
            entry = dict(id=t["id"], period=t["period"], topic=t["topic"], title=t["title"], text=t["text"],
                         answers=[dict(label=lab, h=ans_hash(salt, regno, t["id"], i, val))
                                  for i, (lab, val) in enumerate(t["answers"])])
            if "viz" in t:
                entry["viz"] = t["viz"]
            pub.append(entry)
            for i, (lab, val) in enumerate(t["answers"]):
                v = F(val)
                key_rows.append([regno, name, t["id"], lab, f"{v.numerator}/{v.denominator}" if v.denominator != 1 else str(v.numerator), f"{float(v):.6f}"])
            sheets.append(f"[{t['id']}] {t['title']}\n    {t['text']}")
        sheets.append("")
        students[sk] = pub

    data = dict(course=a.course, n=len(students), students=students)
    with open(os.path.join(ROOT, "docs", "data.js"), "w", encoding="utf-8") as fh:
        fh.write("window.PASSPORT_SALT=" + json.dumps(salt) + ";\nwindow.PASSPORT=" + json.dumps(data, ensure_ascii=False) + ";\n")
    with open(os.path.join(ROOT, "private", "answer_key.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["regno", "name", "task", "part", "answer", "decimal"])
        w.writerows(key_rows)
    with open(os.path.join(ROOT, "private", "worksheets.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(sheets))
    # teacher dashboard (private: contains names)
    import re
    roster_map = {sha(f"{salt}|{rg}")[:12]: [rg, nm] for rg, nm in roster}
    first = next(iter(students.values()))
    task_parts = {t["id"]: len(t["answers"]) for t in first}
    cfg = open(os.path.join(ROOT, "docs", "config.js"), encoding="utf-8").read()
    m = re.search(r'url:\s*"([^"]*)"', cfg)
    tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "dashboard_template.html"), encoding="utf-8").read()
    tpl = (tpl.replace("/*ROSTER*/{}/*END*/", json.dumps(roster_map, ensure_ascii=False))
              .replace("/*TASKS*/{}/*END*/", json.dumps(task_parts))
              .replace("/*URL*/", m.group(1) if m else ""))
    with open(os.path.join(ROOT, "private", "dashboard.html"), "w", encoding="utf-8") as fh:
        fh.write(tpl)
    print(f"{len(students)} students, {len(key_rows)} answers, {dup} re-draws to keep every student's set unique")
    print("PUBLIC : docs/data.js")
    print("PRIVATE: private/answer_key.csv, private/worksheets.txt, private/dashboard.html, private/salt.txt (keep out of GitHub)")


if __name__ == "__main__":
    main()
