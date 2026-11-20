/* report.js - "Watch your demo" animation, and a one-file animated report students can submit.
   Separate from lab.js on purpose: nothing in the lab or the notebook is changed by this file.
   The animation painters below are closure-free (they use only Math, the DOM and M), so the very same
   source is copied into the downloaded report and plays there with no network and no libraries. */
(function (root) {
  "use strict";
  var Lab = root.PassportLab || (typeof require !== "undefined" ? require("./lab.js") : null);
  var M = Lab.M;

  /* ================= painters (embedded verbatim into the report) ================= */
  function pInit(period, v) {
    var st = { period: period, v: v }, A, B;
    if (period === 1) { st.x0 = M.frac(v.x0); st.R = Math.max(1.6 * Math.abs(st.x0), 4); }
    else if (period === 2) {
      A = v.A; B = v.B; st.d = Math.abs(A * A - B * B);
      st.zoom = Math.max(Math.max(A, st.d / A) / A, Math.max(B, st.d / B) / B) > 2.5;
    } else {
      st.R = Math.max(v.p, v.q) * 1.8; st.cap = 0.12 * st.R;
      [1, -1].forEach(function (dir) {
        var x = 0, y = 0, path = [[0, 0]], k, m, dx, dy;
        for (k = 0; k < 22; k++) {
          m = M.surf(v, x, y);
          dx = Math.max(-st.cap, Math.min(st.cap, dir * m.gx * 0.5 / (6 * v.al * v.p)));
          dy = Math.max(-st.cap, Math.min(st.cap, dir * m.gy * 0.5 / (6 * v.be * v.q)));
          x = Math.max(-st.R, Math.min(st.R, x + dx)); y = Math.max(-st.R, Math.min(st.R, y + dy)); path.push([x, y]);
        }
        if (dir === 1) st.up = path; else st.down = path;
      });
    }
    return st;
  }

  function pDraw(st, cv, t, cols) {
    var c = cv.getContext("2d"), W = cv.width, H = cv.height, v = st.v, PI = Math.PI, i, m, n, label = "", dark = false;
    c.clearRect(0, 0, W, H);
    if (st.period === 1) {
      var a = v.a, R = st.R, s = W / (2.1 * R), fwd = t < 0.5, x = -R + 2 * R * (0.5 - 0.5 * Math.cos(2 * PI * t));
      var X1 = function (u) { return W / 2 + u * s; }, Y1 = function (u) { return H * 0.8 - u * s; };
      c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.strokeStyle = cols.line; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y1(0)); c.lineTo(W, Y1(0)); c.moveTo(X1(0), 0); c.lineTo(X1(0), H); c.stroke();
      c.strokeStyle = "#1f6f8b"; c.lineWidth = 2.4; c.beginPath();
      for (i = 0; i <= 240; i++) { n = -R + 2 * R * i / 240; (i ? c.lineTo : c.moveTo).call(c, X1(n), Y1(n * n / (4 * a))); }
      c.stroke();
      c.setLineDash([6, 4]); c.lineWidth = 2; c.strokeStyle = "#c58a1b"; c.globalAlpha = 0.4; c.beginPath();
      for (i = 0; i <= 240; i++) { m = M.parab(a, -R + 2 * R * i / 240); (i ? c.lineTo : c.moveTo).call(c, X1(m.al), Y1(m.be)); }
      c.stroke(); c.globalAlpha = 1; c.beginPath();
      for (i = 0; i <= 120; i++) { n = fwd ? -R + (x + R) * i / 120 : x + (R - x) * i / 120; m = M.parab(a, n); (i ? c.lineTo : c.moveTo).call(c, X1(m.al), Y1(m.be)); }
      c.stroke(); c.setLineDash([]);
      m = M.parab(a, x);
      if (m.rho * s < 6000) { c.strokeStyle = "#b4442b"; c.lineWidth = 2; c.beginPath(); c.arc(X1(m.al), Y1(m.be), m.rho * s, 0, 2 * PI); c.stroke(); }
      c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(X1(m.x), Y1(m.y)); c.lineTo(X1(m.al), Y1(m.be)); c.stroke(); c.setLineDash([]);
      c.fillStyle = "#1f6f8b"; c.beginPath(); c.arc(X1(m.x), Y1(m.y), 5, 0, 2 * PI); c.fill();
      c.fillStyle = "#b4442b"; c.beginPath(); c.arc(X1(m.al), Y1(m.be), 4, 0, 2 * PI); c.fill();
      c.restore();
      label = "x = " + M.fmt(m.x) + "    ρ = " + M.fmt(m.rho) + "    centre = (" + M.fmt(m.al) + ", " + M.fmt(m.be) + ")";
    } else if (st.period === 2) {
      var A2 = v.A, B2 = v.B, th = 2 * PI * t, ex = 1.15 * (st.zoom ? A2 : Math.max(A2, st.d / A2)), ey = 1.15 * (st.zoom ? B2 : Math.max(B2, st.d / B2));
      var s2 = Math.min(W / 2 / ex, H / 2 / ey);
      var X2 = function (u) { return W / 2 + u * s2; }, Y2 = function (u) { return H / 2 - u * s2; };
      c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      c.strokeStyle = cols.line; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y2(0)); c.lineTo(W, Y2(0)); c.moveTo(X2(0), 0); c.lineTo(X2(0), H); c.stroke();
      c.strokeStyle = "#7a4fa3"; c.lineWidth = 2.4; c.beginPath();
      for (i = 0; i <= 360; i++) { m = M.ellipse(A2, B2, i * PI / 180); (i ? c.lineTo : c.moveTo).call(c, X2(m.x), Y2(m.y)); }
      c.stroke();
      c.setLineDash([6, 4]); c.lineWidth = 2; c.strokeStyle = "#c58a1b"; c.globalAlpha = 0.4; c.beginPath();
      for (i = 0; i <= 360; i++) { m = M.ellipse(A2, B2, i * PI / 180); (i ? c.lineTo : c.moveTo).call(c, X2(m.al), Y2(m.be)); }
      c.stroke(); c.globalAlpha = 1; c.beginPath();
      for (i = 0; i <= 180; i++) { m = M.ellipse(A2, B2, th * i / 180); (i ? c.lineTo : c.moveTo).call(c, X2(m.al), Y2(m.be)); }
      c.stroke(); c.setLineDash([]);
      m = M.ellipse(A2, B2, th);
      if (m.rho * s2 < 6000) { c.strokeStyle = "#b4442b"; c.lineWidth = 2; c.beginPath(); c.arc(X2(m.al), Y2(m.be), m.rho * s2, 0, 2 * PI); c.stroke(); }
      c.strokeStyle = "#999"; c.setLineDash([5, 4]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(X2(m.x), Y2(m.y)); c.lineTo(X2(m.al), Y2(m.be)); c.stroke(); c.setLineDash([]);
      c.fillStyle = "#7a4fa3"; c.beginPath(); c.arc(X2(m.x), Y2(m.y), 5, 0, 2 * PI); c.fill();
      c.fillStyle = "#b4442b"; c.beginPath(); c.arc(X2(m.al), Y2(m.be), 4, 0, 2 * PI); c.fill();
      c.restore();
      label = "θ = " + M.fmt(th * 180 / PI) + "°    ρ = " + M.fmt(m.rho) + "    centre = (" + M.fmt(m.al) + ", " + M.fmt(m.be) + ")";
    } else {
      var R3 = st.R, X3 = function (u) { return (u + R3) / (2 * R3) * (W - 1); }, Y3 = function (u) { return (R3 - u) / (2 * R3) * (H - 1); };
      if (!st.off || st.off.width !== W) {
        st.off = document.createElement("canvas"); st.off.width = W; st.off.height = H;
        var oc = st.off.getContext("2d"), img = oc.createImageData(W, H), vals = new Float32Array(W * H), j, lo, hi, q, k;
        for (j = 0; j < H; j++) for (i = 0; i < W; i++) vals[j * W + i] = M.surf(v, -R3 + 2 * R3 * i / (W - 1), R3 - 2 * R3 * j / (H - 1)).g;
        var sorted = Array.prototype.slice.call(vals).sort(function (p1, p2) { return p1 - p2; });
        lo = sorted[Math.floor(sorted.length * 0.02)]; hi = sorted[Math.floor(sorted.length * 0.98)];
        for (i = 0; i < vals.length; i++) {
          q = Math.max(0, Math.min(1, (vals[i] - lo) / (hi - lo))); k = i * 4;
          img.data[k] = 30 + 200 * q; img.data[k + 1] = 40 + 170 * q * q + 30 * q; img.data[k + 2] = 110 + 200 * (1 - q) * q + 40 * q; img.data[k + 3] = 255;
        }
        oc.putImageData(img, 0, 0);
      }
      c.drawImage(st.off, 0, 0);
      var up = t < 0.5, path = up ? st.up : st.down, u2 = (up ? t : t - 0.5) * 2 * (path.length - 1), kk = Math.min(path.length - 2, Math.floor(u2)), f = u2 - kk;
      var px = path[kk][0] + (path[kk + 1][0] - path[kk][0]) * f, py = path[kk][1] + (path[kk + 1][1] - path[kk][1]) * f;
      c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath();
      for (i = 0; i <= kk; i++) (i ? c.lineTo : c.moveTo).call(c, X3(path[i][0]), Y3(path[i][1]));
      c.lineTo(X3(px), Y3(py)); c.stroke();
      c.fillStyle = "#fff"; c.strokeStyle = "#111"; c.lineWidth = 2.5; c.beginPath(); c.arc(X3(px), Y3(py), 7, 0, 2 * PI); c.fill(); c.stroke();
      m = M.surf(v, px, py); dark = true;
      label = (up ? "uphill" : "downhill") + "    g = " + M.fmt(m.g) + "    |slope| = " + M.fmt(Math.sqrt(m.gx * m.gx + m.gy * m.gy));
    }
    c.fillStyle = dark ? "rgba(0,0,0,0.6)" : cols.bg; c.fillRect(8, 8, Math.min(W - 16, label.length * 8.6 + 20), 30);
    c.fillStyle = dark ? "#fff" : cols.ink; c.font = "bold 15px system-ui, sans-serif"; c.fillText(label, 18, 28);
  }

  function player(cv, st, cols) {
    var ctl = { playing: true, speed: 1, t: 0, last: null, id: 0, dur: 14000 };
    function frame(now) {
      if (!cv.isConnected) return;
      if (ctl.playing) { if (ctl.last !== null) ctl.t = (ctl.t + (now - ctl.last) * ctl.speed / ctl.dur) % 1; ctl.last = now; } else ctl.last = null;
      pDraw(st, cv, ctl.t, cols); ctl.id = requestAnimationFrame(frame);
    }
    ctl.seek = function (tt) { ctl.t = tt; pDraw(st, cv, tt, cols); };
    ctl.toggle = function () { ctl.playing = !ctl.playing; return ctl.playing; };
    ctl.stop = function () { ctl.playing = false; if (ctl.id && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(ctl.id); ctl.id = 0; };
    ctl.id = requestAnimationFrame(frame);
    return ctl;
  }

  /* ================= the downloadable report (runs inside the report file) ================= */
  function reportMain(D) {
    var host = document.getElementById("root"), cs = getComputedStyle(document.body);
    var cols = { ink: cs.color, bg: getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#fff", line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#cfc8b8" };
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
    function block(sec, title, text) {
      if (!text) return; var b = el("div", "nb"); b.appendChild(el("b", "", title)); b.appendChild(el("div", "txt", text)); sec.appendChild(b);
    }
    var hd = el("div", "hd"); hd.appendChild(el("h1", "", "Calculus Passport · animated report"));
    hd.appendChild(el("p", "mute", "Register number " + D.reg + " · created " + D.when));
    hd.appendChild(el("p", "mute", "Stamps: " + ["1", "2", "3"].map(function (p) { return "P" + p + " " + (D.stamps[p] || "-"); }).join("   ")));
    hd.appendChild(el("p", "mute", "Press Play to watch the demonstration. Each picture is drawn from this student's own curve or surface."));
    host.appendChild(hd);
    D.periods.forEach(function (P) {
      var sec = el("section", "card"); sec.appendChild(el("h2", "", P.title));
      if (P.viz) {
        var cv = el("canvas"); cv.width = 560; cv.height = 420; sec.appendChild(cv);
        var ctl = player(cv, pInit(P.p, P.viz), cols); ctl.seek(0.3);
        var row = el("div", "row"), pb = el("button", "", "Pause"), sp = el("select", "");
        pb.addEventListener("click", function () { pb.textContent = ctl.toggle() ? "Pause" : "Play"; });
        [["0.5", "slow"], ["1", "normal"], ["2", "fast"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; if (o[0] === "1") op.selected = true; sp.appendChild(op); });
        sp.addEventListener("change", function () { ctl.speed = Number(sp.value); });
        row.appendChild(pb); row.appendChild(el("span", "mute", "speed")); row.appendChild(sp); sec.appendChild(row);
      } else sec.appendChild(el("p", "mute", "The lab was not opened in this period."));
      sec.appendChild(el("p", "mute", "Explored: " + P.moves + " moves" + (P.lo === null ? "" : ", from " + M.fmt(P.lo) + " to " + M.fmt(P.hi)) + " · " + P.readings.length + " recorded readings"));
      if (P.readings.length) { var ul = el("ul", "rd"); P.readings.forEach(function (r) { ul.appendChild(el("li", "", r)); }); sec.appendChild(ul); }
      block(sec, "What I observed", P.obs); block(sec, "Where I struggled", P.str); block(sec, "Important points I learnt", P.learn);
      host.appendChild(sec);
    });
    var F = D["final"];
    if (F && (F.remember || F.use || F.c1 || F.c2 || F.c3)) {
      var fs = el("section", "card"); fs.appendChild(el("h2", "", "Final reflection"));
      block(fs, "The one idea I will remember", F.remember); block(fs, "Where I could use this", F.use);
      fs.appendChild(el("p", "mute", "Confidence (1 low, 5 high): curvature " + (F.c1 || "-") + ", evolutes and envelopes " + (F.c2 || "-") + ", extrema " + (F.c3 || "-")));
      host.appendChild(fs);
    }
  }

  var CSS = ":root{--bg:#f6f4ef;--card:#fff;--ink:#1d2433;--mute:#6b7385;--line:#e2ddd0;--acc:#b4442b}" +
    "@media(prefers-color-scheme:dark){:root{--bg:#14171f;--card:#1c212c;--ink:#ecebe6;--mute:#9aa3b5;--line:#2c3342;--acc:#e2765c}}" +
    "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    ".w{max-width:760px;margin:0 auto;padding:18px 14px 60px}h1{font:700 1.5rem/1.2 Georgia,serif;margin:.2em 0}h2{font-size:1.1rem;margin:.1em 0 .5em;color:var(--acc)}" +
    ".card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:14px 0}.mute{color:var(--mute);font-size:.88rem;margin:.3em 0}" +
    "canvas{width:100%;max-width:560px;height:auto;border:1px solid var(--line);border-radius:10px;background:var(--card);display:block}" +
    ".row{display:flex;gap:10px;align-items:center;margin:8px 0}button,select{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 12px}" +
    "button{cursor:pointer}.nb{margin-top:10px}.txt{white-space:pre-wrap;border-left:3px solid var(--acc);padding-left:10px}.rd{margin:.4em 0;padding-left:1.2em;font-size:.92rem}" +
    "@media print{.row{display:none}body{background:#fff}}";

  var NEEDS = { 1: ["1.1", "1.2"], 2: ["1.4", "2.1"], 3: ["3.5"] }, VIZ = { 1: "1.2", 2: "2.1", 3: "3.5" };
  var TITLES = { 1: "Period 1 · Curvature on my own parabola", 2: "Period 2 · Evolute of my own ellipse", 3: "Period 3 · My own surface" };
  var CAPTION = {
    1: "The point P sweeps along your parabola. The red circle is the circle of curvature, and the dashed gold curve is the evolute traced by its centre.",
    2: "The point P goes once round your ellipse. The gold curve is the evolute being drawn by the centre of curvature.",
    3: "The dot first walks uphill from the origin, then downhill. Watch where it slows down: those are the critical points."
  };
  function unlocked(period, ctx) { return NEEDS[period].every(ctx.done); }
  function vizOf(period, ctx) { var t = ctx.tasks.filter(function (x) { return x.id === VIZ[period]; })[0]; return t && t.viz ? t.viz : null; }
  function colsNow() {
    var rs = getComputedStyle(document.documentElement);
    return { ink: getComputedStyle(document.body).color, bg: rs.getPropertyValue("--card").trim() || "#fff", line: rs.getPropertyValue("--line").trim() || "#ccc" };
  }

  /* ================= card shown on the page, after the lab ================= */
  function card(period, box, ctx) {
    if (!unlocked(period, ctx)) return null;
    var v = vizOf(period, ctx); if (!v) return null;
    function el(tag, attrs, kids) {
      var e = document.createElement(tag), k;
      for (k in (attrs || {})) { if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
      (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
      return e;
    }
    var cv = el("canvas", { width: "560", height: "420", role: "img", "aria-label": "Animation of your own demonstration" });
    var c = el("div", { class: "card lab", style: "--c:" + ctx.color });
    c.appendChild(el("div", { class: "topic", text: "Watch your demo · animation" }));
    c.appendChild(cv);
    var ctl = player(cv, pInit(period, v), colsNow()); ctl.seek(0.25);
    var pb = el("button", { class: "ghost", text: "Pause", onclick: function () { pb.textContent = ctl.toggle() ? "Pause" : "Play"; } });
    var sp = el("select", { "aria-label": "Animation speed" }, [["0.5", "slow"], ["1", "normal"], ["2", "fast"]].map(function (o) { var op = el("option", { value: o[0], text: o[1] }); if (o[0] === "1") op.selected = true; return op; }));
    sp.addEventListener("change", function () { ctl.speed = Number(sp.value); });
    c.appendChild(el("div", { class: "row", style: "margin-top:8px" }, [pb, el("span", { class: "small", text: "speed" }), sp,
      el("button", { text: "Download my animated report", onclick: function () { download(ctx); } })]));
    c.appendChild(el("div", { class: "small", style: "margin-top:6px", text: CAPTION[period] + " The animated report is one file with all your pictures, readings and notebook. Submit it together with your submission file." }));
    box.appendChild(c);
    return ctl;
  }

  /* ================= build and download the report ================= */
  function buildHTML(ctx) {
    var save = ctx.save, lab = save.lab || {};
    var data = { reg: ctx.reg, when: new Date().toISOString().slice(0, 16).replace("T", " "), stamps: {}, periods: [], "final": lab["final"] || {} };
    [1, 2, 3].forEach(function (p) {
      var L = lab["p" + p] || {};
      data.stamps[p] = ctx.stamp ? ctx.stamp(p) : "";
      data.periods.push({ p: p, title: TITLES[p], viz: unlocked(p, ctx) ? vizOf(p, ctx) : null, moves: L.moves || 0, lo: L.lo === undefined ? null : L.lo, hi: L.hi === undefined ? null : L.hi,
        readings: L.readings || [], obs: L.obs || "", str: L.str || "", learn: L.learn || "" });
    });
    var json = JSON.stringify(data).replace(/</g, "\\u003c").split(String.fromCharCode(8232)).join("\\u2028").split(String.fromCharCode(8233)).join("\\u2029");
    var Msrc = "var M={" + Object.keys(M).map(function (k) { return JSON.stringify(k) + ":" + M[k].toString(); }).join(",") + "};";
    var script = Msrc + "\n" + pInit.toString() + "\n" + pDraw.toString() + "\n" + player.toString() + "\n" + reportMain.toString() +
      "\nreportMain(JSON.parse(document.getElementById('data').textContent));";
    return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>Calculus Passport animated report</title><style>" + CSS + "</style></head><body><div class=\"w\" id=\"root\"></div>" +
      "<script type=\"application/json\" id=\"data\">" + json + "</script><script>" + script + "</script></body></html>\n";
  }
  function download(ctx) {
    var html = buildHTML(ctx), blob = new Blob([html], { type: "text/html" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "passport_" + ctx.reg + "_animated.html"; document.body.appendChild(a); a.click(); a.remove();
    return html;
  }

  var api = { card: card, buildHTML: buildHTML, download: download, pInit: pInit, pDraw: pDraw, player: player, unlocked: unlocked };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PassportReport = api;
})(typeof window !== "undefined" ? window : globalThis);
