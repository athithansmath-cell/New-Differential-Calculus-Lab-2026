#!/usr/bin/env python3
"""Writes docs/exam-live.html : the teacher's live class view for the two exam pages (reads /exam and /visual)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import bank_core as B, bank1, bank2  # noqa
from meta import TASKS, MOCK

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bank = B.build()
Q = {}
for qid, spec in bank.items():
    Q[qid] = [spec["task"], len(spec["labels"])]
cfg = open(os.path.join(ROOT, "docs", "config.js"), encoding="utf-8").read()
import re
m = re.search(r'url:\s*"([^"]*)"', cfg)
URL = m.group(1) if m else ""
names = {str(k): v["name"] for k, v in TASKS.items() if k < 10}
tpl = open(os.path.join(os.path.dirname(__file__), "live_template.html"), encoding="utf-8").read()
out = tpl.replace("/*Q*/{}/*END*/", json.dumps(Q)).replace("/*MOCK*/[]/*END*/", json.dumps(MOCK)).replace("/*NAMES*/{}/*END*/", json.dumps(names, ensure_ascii=False)).replace("/*URL*/", URL)
open(os.path.join(ROOT, "docs", "exam-live.html"), "w", encoding="utf-8").write(out)
print("wrote docs/exam-live.html;", len(Q), "question types;", sum(v[1] for v in Q.values()), "answer boxes")
