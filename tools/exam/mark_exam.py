"""Mark Exam-Ready Practice submissions.
Usage: python3 mark_exam.py submission1.txt [submission2.txt ...]   (or a folder)
Needs private/exam_answers.json and private/exam_salt.txt (keep these off GitHub)."""
import sys, os, json, hashlib, glob, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
ANS = json.load(open(os.path.join(ROOT, "private", "exam_answers.json")))
SALT = open(os.path.join(ROOT, "private", "exam_salt.txt")).read().strip()
sha = lambda s: hashlib.sha256(s.encode()).hexdigest()
def vidx(reg, dob, qid, mode): return int(sha(f"{reg}|{dob}|{qid}|{mode}")[:8], 16) % 150
def mark(path):
    L = open(path, encoding="utf-8").read().split("\n")
    hd = {}; 
    for l in L[:6]:
        if ": " in l: k, v = l.split(": ", 1); hd[k] = v
    pm = "visual" if L[0].startswith("VISUAL") else "practice"
    reg = hd.get("Register number", ""); dob = re.sub(r"\D", "", hd.get("Date of birth", ""))
    i = next((j for j, l in enumerate(L) if l.startswith("Created:")), 5) + 2
    j = next((k for k, l in enumerate(L) if l.startswith("CHECK:")), len(L))
    body = L[i:j - 1]; chk = L[j].split(":")[1].strip() if j < len(L) else ""
    ok_check = sha(f"{SALT}|{reg}|{dob}|" + "\n".join(body))[:20] == chk
    pr, mk, started, fin = {}, {}, False, "no"; nviz = sum(1 for l in body if l.startswith("VIZ ")); nlab = sum(1 for l in body if l.startswith("LAB "))
    for l in body:
        m = re.match(r"(ANSWER|MOCK) (\d+\.\d+):(\d+) = (\S+)$", l)
        if m:
            kind, q, p, val = m.groups(); p = int(p)
            exp = ANS[q][vidx(reg, dob, q, pm if kind == "ANSWER" else ("vmock" if pm == "visual" else "mock"))]["a"]
            good = p < len(exp) and exp[p] == val
            (pr if kind == "ANSWER" else mk).setdefault(q, [0, len(exp)])[0] += good
        elif l.startswith("MOCK-FINISHED"): fin = l.split(": ")[1]
    task = {}
    for q, (g, n) in pr.items(): t = q.split(".")[0]; task.setdefault(t, [0, 0]); task[t][0] += g; task[t][1] += n
    total_q = len(ANS)
    solved = sum(1 for q, (g, n) in pr.items() if g == n)
    mock_ok = sum(1 for q, (g, n) in mk.items() if g == n)
    return dict(reg=reg, name=hd.get("Name", ""), check="OK" if ok_check else "TAMPERED/EDITED",
                practice=f"{solved}/{total_q}", mock=f"{mock_ok}/12", mock_finished=fin,
                pictures=nviz, labs=nlab, wrong_entries=sum(1 for q in pr if pr[q][0] != pr[q][1]) + sum(1 for q in mk if mk[q][0] != mk[q][1]),
                per_task=" ".join(f"T{t}:{v[0]}/{v[1]}" for t, v in sorted(task.items())))
if __name__ == "__main__":
    files = []
    for a in sys.argv[1:]: files += sorted(glob.glob(os.path.join(a, "*.txt"))) if os.path.isdir(a) else [a]
    print("reg\tname\tcheck\tpractice-questions\tmock\tmock-finished\tpictures-opened\tlabs-used\twrong-entries\tper-task")
    for f in files:
        r = mark(f); print("\t".join(str(r[k]) for k in ["reg","name","check","practice","mock","mock_finished","pictures","labs","wrong_entries","per_task"]))
