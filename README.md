# Calculus Passport

A three-period (3 × 50 min) worked-problem activity for **Differential Calculus** (curvature, evolutes, involutes, envelopes, pedal equations) and **Functions of Several Variables** (partial derivatives, Euler, Jacobians, Taylor series, extrema, Lagrange multipliers).

**The idea.** Every student gets a curve and a surface that no other student has: their own parabola, ellipse, spiral, cycloid, cubic surface. All answers are exact fractions, so a student who has really worked a problem ends with a clean number, and a student who copies a neighbour ends with a wrong one. The page checks answers without ever showing them.

| Period | Tasks | Topics covered |
|---|---|---|
| 1 | 1.1 – 1.5 + picture | Radius of curvature (Cartesian, parametric, polar), centre and circle of curvature |
| 2 | 2.1 – 2.6 + picture | Evolute of an ellipse and cycloid, involute–evolute arc relation, two envelope problems, pedal equations (polar and Cartesian) |
| 3 | 3.1 – 3.6 + picture + bonus | Partial derivatives, Euler (second order), Jacobian, Taylor series, extrema, Lagrange multipliers |

Each period ends with the "Tutorial" picture: once a student confirms the key task, the page draws **their own** curve (circle of curvature, evolute point, heat map of their surface with its minimum and maximum), built from the answers they entered.

## Setup (10 minutes)

1. **Roster.** Make `roster.csv` with one student per line: `register number,name` (name optional).
2. **Generate.**
   ```
   python3 tools/generate.py roster.csv
   ```
   This writes `docs/data.js` (public) and a `private/` folder (never push it; `.gitignore` already excludes it):
   `answer_key.csv` (every answer), `worksheets.txt` (each student's problems), `salt.txt`.
3. **Check (optional but recommended).**
   ```
   pip install sympy mpmath
   python3 tools/verify_sympy.py roster.csv
   ```
   Recomputes every answer from first principles with calculus, independently of the generator.
4. **Publish.** Push the repo to GitHub, then *Settings → Pages → Deploy from a branch → `main` → `/docs`*. Share the link; students enter their register number.
   `docs/data.js` holds only hashed answers and no names, so it is safe to publish.

`docs/data.js` currently contains **70 demo students** (`RA251000` … `RA251069`). Replace it with step 2 before class.

## In the classroom

- **Working first.** The answer boxes only check after the student has written at least a few lines of working in the box above. Wrong answers get a hint after two tries, a nudge to see you after four. Partial answers lock the parts that are right.
- **Timer.** A 50-minute countdown sits in the header.
- **Paper copy.** *Print my problem sheet* gives each student their own sheet with ruled working space, for a pen-and-paper version.
- **Submission.** *Download my submission* saves a `.txt` file with answers, working and a stamp per period.
- **Bonus (period 3).** Students set a problem for a neighbour. Putting it in the file shows who can think in reverse.

## Marking

Collect the files in one folder and run

```
python3 tools/verify.py submissions/*.txt --csv marks.csv
```

For each student it reports answers correct, answers wrong or forged, whether each period stamp is valid (a stamp can only be produced from the true answers), tasks with thin working, and **identical written working in two different students' files**.

A suggested split of 30 marks: 6 per period for confirmed answers, 3 per period for working quality (sample a few tasks per student from the file), 1 per period for submitting, 3 for the bonus and visuals.

## Live watch (Firebase, optional)

While students work, `private/dashboard.html` shows: who is logged in, a colour grid of progress by task, students who are stuck (4 or more wrong tries, adjustable), and a top-10 leaderboard (names hidden unless you tick *show names*, so you can project it).

**One-time setup (about 10 minutes)**

1. Go to <https://console.firebase.google.com>, *Add project* (switch Google Analytics off).
2. *Build → Realtime Database → Create database*. Pick a location (Singapore `asia-southeast1` is closest to Chennai) and start in **locked mode**.
3. Open the **Rules** tab, paste the contents of `firebase/database.rules.json`, press *Publish*.
4. On the **Data** tab copy the database URL shown at the top (it ends in `firebasedatabase.app`).
5. Paste it between the quotes in `docs/config.js`, then run `python3 tools/generate.py roster.csv` again (this also refreshes the dashboard), and push `docs/` to GitHub.
6. Open `private/dashboard.html` on your computer. It reads the URL itself; if the box is empty, paste the URL and press *Connect*.

**What is sent.** Only an anonymous 12-character code, an online flag, the confirmed part ids with the time, and wrong-try counts per task. Never names, register numbers, answers or working. Students see a notice on the login screen when live watch is on. The code-to-name list lives only in your private dashboard file.

**Between sessions.** Progress stays in the database, so the dashboard is cumulative across the three periods. To clear it for a new batch, delete the `live` node on the Data tab.

**Limits.** The dashboard is for watching, not marking: anyone who knows a classmate's register number could in principle post fake progress for them. Marks come from `tools/verify.py`, whose stamps cannot be forged. With live watch left empty in `config.js`, nothing is sent anywhere.

## Honest limits

- Answers are checked in the browser against hashes. A determined student can read the page's JavaScript, but the hashes do not reveal the answers, and the stamp cannot be forged without them.
- A student can solve with a computer algebra system. That still means doing the calculus, but if you want to rule it out, run the activity in a lab with the page open on a device and paper only.
- With a class of 70, every student gets a different version of almost every task (in a test run, only 2.6 and 3.3 repeat, for a handful of students). Every student's full set of 17 tasks is different. A class larger than about 80 will see more repeats in the ellipse family.
- Fractions are required because decimals like 1/3 cannot be matched exactly. The page accepts any terminating decimal and any fraction, reduced or not.

## Files

```
docs/        the student site (index.html, app.js, core.js, style.css, data.js)
tools/       generate.py, verify_sympy.py, verify.py, gen_lib.py (the problem bank), dashboard_template.html
firebase/    database.rules.json (paste into Firebase for live watch)
private/     created by generate.py; keep it off GitHub
```
