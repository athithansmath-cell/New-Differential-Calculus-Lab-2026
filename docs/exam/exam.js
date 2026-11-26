(function () {
  "use strict";
  var CFG = window.EXAM_CFG || {}, TMAX = CFG.mock === false ? 9 : 10, C = window.PassportCore, M = window.EXAMMETA, $ = function (id) { return document.getElementById(id); };
  var S = { reg: "", name: "", dob: "", mail: "", ident: "", save: null, task: 1, timer: null };
  var loaded = {};
  /* live status to the teacher (Firebase REST via ../live.js); silent if not configured */
  var LIVE = CFG.live && window.PassportLive && window.PassportLive.enabled() ? window.PassportLive : null, NOW = { ".sv": "timestamp" };
  function liveStart() {
    if (!LIVE) return;
    var s = {}, w = {}, mk = {}, v = {}, l = {}, extra = {};
    Object.keys(S.save.solved).forEach(function (q) { (S.save.solved[q] || []).forEach(function (c, i) { if (c != null) s[q + ":" + i] = 1; }); });
    Object.keys(S.save.tries).forEach(function (k) { if (k.indexOf("practice:") === 0 && S.save.tries[k]) w[k.slice(9)] = S.save.tries[k]; });
    var m = S.save.mock || {}; Object.keys(m.solved || {}).forEach(function (q) { (m.solved[q] || []).forEach(function (c, i) { if (c != null) mk[q + ":" + i] = NOW; }); });
    Object.keys(S.save.viz || {}).forEach(function (q) { v[q] = 1; }); Object.keys(S.save.lab || {}).forEach(function (t) { l[t] = 1; });
    extra = { mk: mk, v: v, l: l, mf: m.done ? 1 : 0 }; if (m.start) extra.ms = m.start; if (m.done && m.score != null) extra.sc = m.score;
    LIVE.start(C.sha256("live|" + S.ident + "|" + CFG.live).slice(0, 12), s, w, { n: S.name, r: S.reg, pre: CFG.live, extra: extra });
  }

  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) { if (k === "text") e.textContent = attrs[k]; else if (k === "onclick") e.addEventListener("click", attrs[k]); else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function storeKey() { return (CFG.key || "exam") + ":" + S.ident; }
  function load() { try { S.save = JSON.parse(localStorage.getItem(storeKey()) || "null"); } catch (e) { S.save = null; } if (!S.save) S.save = { solved: {}, tries: {}, viz: {}, lab: {}, mock: { start: 0, done: false, solved: {}, score: null } }; S.save.viz = S.save.viz || {}; S.save.lab = S.save.lab || {}; S.save.mock = S.save.mock || { start: 0, done: false, solved: {}, score: null }; }
  function persist() { try { localStorage.setItem(storeKey(), JSON.stringify(S.save)); } catch (e) {} }

  function variantIndex(qid, mode) { if (mode === "practice" && CFG.mode) mode = CFG.mode; if (mode === "mock" && CFG.mockMode) mode = CFG.mockMode; return parseInt(C.sha256(S.reg + "|" + S.dob + "|" + qid + "|" + mode).slice(0, 8), 16) % M.nv; }
  function ahash(qid, v, i, canon) { return C.sha256(M.salt + "|" + qid + "|" + v + "|" + i + "|" + canon).slice(0, 14); }

  function ensure(task, cb) {
    if (loaded[task]) return cb();
    var s = document.createElement("script"); s.src = (CFG.data || "data/") + "t" + task + ".js";
    s.onload = function () { loaded[task] = true; cb(); };
    s.onerror = function () { $("panel").textContent = "Could not load the question data. Check your internet and reload."; };
    document.head.appendChild(s);
  }
  function qdata(qid) { return window.EXAMDATA[M.qs[qid].task][qid]; }
  function qids(task) { return Object.keys(M.qs).filter(function (q) { return M.qs[q].task === task; }).sort(function (a, b) { return +a.split(".")[1] - +b.split(".")[1]; }); }

  /* ---- progress ---- */
  function qDone(store, qid) { var d = store[qid]; return !!d && d.length === qdata(qid).labels.length && d.every(function (x) { return x != null; }); }
  function taskCount(task) { return qids(task).filter(function (q) { return S.save.solved[q] && S.save.solved[q].every(function (x) { return x != null; }) && S.save.solved[q].length; }).length; }
  function overall() {
    var tot = 0, ok = 0, t;
    for (t = 1; t <= 9; t++) { qids(t).forEach(function (q) { tot++; var d = S.save.solved[q]; if (d && d.length && d.every(function (x) { return x != null; })) ok++; }); }
    $("overall").textContent = ok + " of " + tot + " questions confirmed";
    $("obar").style.width = (100 * ok / tot) + "%";
    return ok;
  }

  function tabs() {
    var box = $("tabs"); box.innerHTML = "";
    for (var t = 1; t <= TMAX; t++) (function (t) {
      var full = t < 10 && taskCount(t) === qids(t).length;
      var b = h("button", { text: (t === 10 ? "Mock exam" : "Task " + t) + (full ? " ✓" : ""), class: (S.task === t ? "on " : "") + (full ? "full" : ""), onclick: function () { S.task = t; show(); } });
      b.title = M.tasks[t].name; box.appendChild(b);
    })(t);
  }

  function fmt(sec) { sec = Math.max(0, sec); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }

  function whyBox(t) {
    var T = M.tasks[t];
    return h("details", { class: "card why" }, [h("summary", { text: "Why this task matters (learning, industry, future, SDG)" }), h("dl", { class: "why" }, [
      h("dt", { text: "Learning" }), h("dd", { text: T.learn }), h("dt", { text: "Industry" }), h("dd", { text: T.industry }),
      h("dt", { text: "Future" }), h("dd", { text: T.future }), T.visual && CFG.viz !== false ? h("dt", { text: "Visual learning in this task" }) : null, T.visual && CFG.viz !== false ? h("dd", { text: T.visual }) : null, h("dt", { text: "Sustainable Development Goal" }), h("dd", { text: T.sdg })])]);
  }

  /* one question card; store = save.solved (practice) or save.mock.solved */
  function qCard(qid, mode, store, opts) {
    var d = qdata(qid), v = variantIndex(qid, mode), vr = d.v[v];
    var cur = store[qid] || (store[qid] = d.labels.map(function () { return null; }));
    var done = cur.every(function (x) { return x != null; });
    var card = h("div", { class: "card qcard" + (done ? " done" : "") });
    card.appendChild(h("div", { class: "topic", text: qid + " · " + d.title }));
    card.appendChild(h("div", { class: "qtext", text: vr.t }));
    var parts = h("div", { class: "parts" }), ins = [];
    d.labels.forEach(function (lab, i) {
      var inp = h("input", { type: "text", autocomplete: "off", placeholder: "fraction or decimal", "aria-label": lab });
      var w = h("div", { class: "part" }, [h("label", { text: lab }), inp]);
      if (cur[i] != null) { inp.value = cur[i]; inp.disabled = true; w.classList.add("ok"); }
      if (opts.locked && cur[i] == null) inp.disabled = true;
      ins.push(inp); parts.appendChild(w);
    });
    card.appendChild(parts);
    var msg = h("div", { class: "msg", role: "status" }), hint = h("div", { class: "hint", hidden: "" });
    var tkey = mode + ":" + qid, vzBox = null, vzWrap = null, vzBtn = null;
    if (opts.viz && window.ExamViz && ExamViz.hasQuestion(qid)) {
      vzWrap = h("div", { class: "vwrap", hidden: "" });
      vzBtn = h("button", { class: "ghost", text: "\uD83D\uDD0D See it", "aria-expanded": "false", onclick: function () {
        var open = vzWrap.hidden; vzWrap.hidden = !open; vzBtn.setAttribute("aria-expanded", open ? "true" : "false"); vzBtn.textContent = open ? "Hide picture" : "\uD83D\uDD0D See it";
        if (open && !vzBox) { vzBox = ExamViz.question(qid, vr.p || {}, { solved: cur.every(function (x) { return x != null; }) }); vzWrap.appendChild(vzBox); }
        if (open && !S.save.viz[qid]) { S.save.viz[qid] = 1; persist(); if (LIVE) LIVE.mark("v", qid, 1); }
      } });
    }
    var btn = h("button", { text: done ? "Confirmed" : "Check", onclick: function () {
      var bad = 0, wrong = 0, fresh = 0;
      d.labels.forEach(function (l, i) {
        if (cur[i] != null) return;
        var cn = C.parseAnswer(ins[i].value);
        if (cn === null) { bad++; return; }
        if (ahash(qid, v, i, cn) === vr.h[i]) { cur[i] = cn; fresh++; if (LIVE) { if (mode === "mock") LIVE.mark("mk", qid + ":" + i); else LIVE.solved(qid + ":" + i); } ins[i].value = cn; ins[i].disabled = true; ins[i].parentNode.classList.add("ok"); } else wrong++;
      });
      if (bad) { msg.className = "msg bad"; msg.textContent = "Type each box as a fraction like 3/4 or a decimal like 0.75."; return; }
      if (wrong) { S.save.tries[tkey] = (S.save.tries[tkey] || 0) + 1; if (LIVE && mode === "practice") LIVE.tries(qid, S.save.tries[tkey]); }
      persist();
      if (cur.every(function (x) { return x != null; })) { if (vzBox && vzBox.__reveal) vzBox.__reveal(); if (opts.onDone) opts.onDone(); else { tabs(); overall(); card.classList.add("done"); btn.disabled = true; btn.textContent = "Confirmed"; msg.className = "msg ok"; msg.textContent = "Correct. Well done."; hint.hidden = true; } return; }
      msg.className = "msg bad";
      msg.textContent = (fresh ? "Some boxes are right (locked in green). " : "") + (wrong ? "The others do not match yet. Recheck your own numbers." : "");
      if (opts.hints && (S.save.tries[tkey] || 0) >= 2) { hint.textContent = "Method: " + d.method; hint.hidden = false; }
    } });
    if (done || opts.locked) btn.disabled = true;
    card.appendChild(h("div", { class: "row" }, [btn, vzBtn])); card.appendChild(msg); card.appendChild(hint); if (vzWrap) card.appendChild(vzWrap);
    if (opts.hints && !done && (S.save.tries[tkey] || 0) >= 2) { hint.textContent = "Method: " + d.method; hint.hidden = false; }
    if (CFG.vizOpen && opts.hints && vzBtn) vzBtn.click();
    return card;
  }

  function show() {
    tabs(); overall();
    var t = S.task, panel = $("panel"); panel.innerHTML = "";
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    panel.appendChild(h("h2", { text: (t === 10 ? "Mock exam" : "Task " + t) + ": " + M.tasks[t].name }));
    panel.appendChild(h("div", { class: "small", text: "Syllabus: " + M.tasks[t].slo }));
    panel.appendChild(whyBox(t));
    if (t === 10) return showMock(panel);
    if (CFG.labs !== false && window.ExamViz && ExamViz.lab) {
      var lb = ExamViz.lab(t);
      if (lb) {
        var det = h("details", { class: "card lab" }, [h("summary", { text: "\uD83E\uDDEA Explore this topic visually (interactive lab) - try the sliders" })]);
        det.open = true; det.appendChild(lb);
        var mark = function () { if (!S.save.lab[t]) { S.save.lab[t] = 1; persist(); if (LIVE) LIVE.mark("l", String(t), 1); } };
        lb.addEventListener("input", mark); lb.addEventListener("click", mark);
        panel.appendChild(det);
      }
    }
    ensure(t, function () {
      qids(t).forEach(function (q) { panel.appendChild(qCard(q, "practice", S.save.solved, { hints: true, viz: CFG.viz !== false })); });
      var nxt = t < TMAX ? h("div", { class: "row" }, [h("button", { class: "ghost", text: t < 9 ? "Next: Task " + (t + 1) : "Next: Mock exam", onclick: function () { S.task = t + 1; show(); window.scrollTo(0, 0); } })]) : null;
      if (nxt) panel.appendChild(nxt);
    });
  }

  /* ---- mock exam ---- */
  var MOCK_MIN = 60;
  function loadAll(cb) {
    var need = [], t; for (t = 1; t <= 9; t++) if (!loaded[t]) need.push(t);
    (function next() { if (!need.length) return cb(); ensure(need.shift(), next); })();
  }
  function showMock(panel) {
    var mk = S.save.mock;
    if (!mk.start) {
      panel.appendChild(h("div", { class: "card" }, [h("p", { text: "Twelve questions, one from each major topic, with different numbers from your practice tasks. No hints. " + MOCK_MIN + " minutes. The clock starts when you press Start, and you can stop early. When you finish, the page shows your score and which tasks to revise." }),
        h("div", { class: "row" }, [h("button", { text: "Start the mock exam", onclick: function () { mk.start = Date.now(); persist(); if (LIVE) LIVE.patch({ ms: mk.start }); show(); } })])]));
      return;
    }
    loadAll(function () {
      var tm = h("div", { class: "timer" }); panel.appendChild(h("div", { class: "card" }, [tm]));
      var finished = mk.done;
      function left() { return MOCK_MIN * 60 - Math.floor((Date.now() - mk.start) / 1000); }
      function finish() {
        if (mk.done) return;
        mk.done = true; var ok = 0, weak = []; M.mock.forEach(function (q) { if (mk.solved[q] && mk.solved[q].length && mk.solved[q].every(function (x) { return x != null; })) ok++; else weak.push(q); });
        mk.score = ok; persist(); if (LIVE) LIVE.patch({ mf: 1, sc: ok }); show();
      }
      if (!finished) {
        S.timer = setInterval(function () { var l = left(); tm.textContent = "Time left: " + fmt(l); if (l <= 0) finish(); }, 1000); tm.textContent = "Time left: " + fmt(left());
      } else tm.textContent = "Finished.";
      M.mock.forEach(function (q) { panel.appendChild(qCard(q, "mock", mk.solved, { hints: false, viz: !!CFG.mockViz, locked: finished, onDone: function () { persist(); show(); } })); });
      if (!finished) panel.appendChild(h("div", { class: "row" }, [h("button", { text: "Finish the mock exam now", onclick: finish })]));
      else {
        var weak = M.mock.filter(function (q) { var d = mk.solved[q]; return !(d && d.length && d.every(function (x) { return x != null; })); });
        var byTask = {}; weak.forEach(function (q) { byTask[M.qs[q].task] = (byTask[M.qs[q].task] || []).concat([q + " " + M.qs[q].title]); });
        var res = h("div", { class: "card" }, [h("h3", { text: "Your score: " + mk.score + " / " + M.mock.length })]);
        if (weak.length) { res.appendChild(h("div", { text: "Revise these, then redo the matching task:" })); var ul = h("ul", { class: "weak" }); Object.keys(byTask).forEach(function (t) { ul.appendChild(h("li", { text: "Task " + t + " (" + M.tasks[t].name + "): " + byTask[t].join("; ") })); }); res.appendChild(ul); }
        else res.appendChild(h("div", { text: "Every question correct. You are exam ready." }));
        panel.appendChild(res);
        if (window.ExamViz && ExamViz.scoreBars) {
          var per = {}; M.mock.forEach(function (q) { var t = M.qs[q].task, d = mk.solved[q], ok = d && d.length && d.every(function (x) { return x != null; }); per[t] = per[t] || [0, 0]; per[t][1]++; if (ok) per[t][0]++; });
          var bc = h("div", { class: "card" }, [h("div", { class: "small", text: "Mock exam result by task (questions right out of questions asked). Orange bars mark the tasks to revisit." })]); ExamViz.scoreBars(bc, per); panel.appendChild(bc);
        }
      }
    });
  }

  /* ---- submission file ---- */
  function submission() {
    var L = [CFG.header || "EXAM-READY PRACTICE SUBMISSION", "Register number: " + S.reg, "Name: " + S.name, "Date of birth: " + S.dob.slice(0, 2) + "/" + S.dob.slice(2, 4) + "/" + S.dob.slice(4), "Email: " + S.mail, "Created: " + new Date().toISOString(), ""];
    var body = [];
    Object.keys(M.qs).sort(function (a, b) { var x = a.split("."), y = b.split("."); return (+x[0] - +y[0]) || (+x[1] - +y[1]); }).forEach(function (q) {
      var d = S.save.solved[q]; if (d) d.forEach(function (c, i) { if (c != null) body.push("ANSWER " + q + ":" + i + " = " + c); });
    });
    Object.keys(S.save.viz || {}).sort().forEach(function (q) { body.push("VIZ " + q); });
    Object.keys(S.save.lab || {}).sort().forEach(function (t) { body.push("LAB " + t); });
    var mk = S.save.mock; if (mk.start) { body.push("MOCK-STARTED: " + new Date(mk.start).toISOString()); body.push("MOCK-FINISHED: " + (mk.done ? "yes" : "no")); }
    Object.keys(mk.solved).forEach(function (q) { var d = mk.solved[q]; d.forEach(function (c, i) { if (c != null) body.push("MOCK " + q + ":" + i + " = " + c); }); });
    L = L.concat(body); L.push("", "CHECK: " + C.sha256(M.salt + "|" + S.reg + "|" + S.dob + "|" + body.join("\n")).slice(0, 20));
    return L.join("\n") + "\n";
  }
  function download() {
    var blob = new Blob([submission()], { type: "text/plain" }), a = h("a", { href: URL.createObjectURL(blob), download: (CFG.file || "exam-practice-") + S.reg + ".txt" });
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
  }

  function login() {
    var reg = C.normReg($("reg").value), name = ($("nm").value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 60), dob = C.normDob($("dob").value), mail = ($("mail").value || "").trim().toLowerCase(), msg = $("msg");
    if (!/^[A-Z0-9]{5,20}$/.test(reg)) { msg.textContent = "Type your register number (letters and digits only)."; return; }
    if (!name) { msg.textContent = "Type your name."; return; }
    if (!dob) { msg.textContent = "Type your date of birth as DD/MM/YYYY."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { msg.textContent = "Type a valid email address."; return; }
    S.reg = reg; S.name = name; S.dob = dob; S.mail = mail; S.ident = reg + "|" + dob; load();
    $("login").hidden = true; $("app").hidden = false; $("who").textContent = name + " · " + reg;
    S.task = 1; show(); liveStart();
  }
  $("go").addEventListener("click", login);
  ["reg", "nm", "dob", "mail"].forEach(function (i) { $(i).addEventListener("keydown", function (e) { if (e.key === "Enter") login(); }); });
  $("dl").addEventListener("click", download);
  $("out").addEventListener("click", function () { if (LIVE) LIVE.stop(); if (S.timer) clearInterval(S.timer); $("app").hidden = true; $("login").hidden = false; $("dob").value = ""; S.save = null; });
})();
