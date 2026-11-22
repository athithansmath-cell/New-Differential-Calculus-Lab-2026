/* discover.js - the "Number Machine" for task 1.0.
   The last four digits of the student's register number switch on four dials, then the machine draws
   the student's own parabola, ellipse and cycloid. Features (focus, vertices, top of an arch) are marked;
   moving the crosshair onto one prints its coordinates. The student reads a, A, B and c from these. */
(function (root) {
  "use strict";
  var SC = ["Parabola", "Ellipse", "Cycloid"];

  function nice(step) { var p = Math.pow(10, Math.floor(Math.log10(step))), m = step / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

  function scene(k, v) {
    if (k === 0) { var a = v.a; return { x0: -4.5 * a, x1: 4.5 * a, y0: -1.3 * a, y1: 4.6 * a, curve: function (ctx, X, Y) {
      ctx.beginPath(); for (var i = 0; i <= 300; i++) { var x = -4.5 * a + 9 * a * i / 300, y = x * x / (4 * a); (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(x), Y(y)); } ctx.stroke(); },
      marks: [{ x: 0, y: 0, l: "vertex", e: true }, { x: 0, y: a, l: "focus F", e: true }, { x: 2 * a, y: a, l: "end of latus rectum", e: true }],
      note: "Parabola x² = 4ay. Move the crosshair onto the focus F: its height is a." }; }
    if (k === 1) { var A = v.A, B = v.B, m = Math.max(A, B) * 1.2; return { x0: -m, x1: m, y0: -m * 0.62, y1: m * 0.62, curve: function (ctx, X, Y) {
      ctx.beginPath(); for (var i = 0; i <= 240; i++) { var t = i / 240 * 2 * Math.PI; (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(A * Math.cos(t)), Y(B * Math.sin(t))); } ctx.stroke(); },
      marks: [{ x: A, y: 0, l: "end of x-axis", e: true }, { x: -A, y: 0, l: "", e: true }, { x: 0, y: B, l: "end of y-axis", e: true }, { x: 0, y: -B, l: "", e: true }],
      note: "Ellipse x = A cos θ, y = B sin θ. Put the crosshair on the two marked ends to read A and B." }; }
    var c = v.c, P = Math.PI; return { x0: -0.5 * c, x1: 4 * P * c + 0.5 * c, y0: -0.4 * c, y1: 2.6 * c, curve: function (ctx, X, Y) {
      ctx.beginPath(); for (var i = 0; i <= 400; i++) { var t = 4 * P * i / 400; (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(c * (t - Math.sin(t))), Y(c * (1 - Math.cos(t)))); } ctx.stroke(); },
      marks: [{ x: P * c, y: 2 * c, l: "top of arch", e: false }, { x: 3 * P * c, y: 2 * c, l: "", e: false }, { x: 2 * P * c, y: 0, l: "cusp", e: false }],
      note: "Cycloid x = c(t − sin t), y = c(1 − cos t). Put the crosshair on the top of an arch: the height is 2c." };
  }

  function attach(card, t, opt) {
    var v = t.viz, digits = String(v.digits || "0000"), cur = 0, box = document.createElement("div"); box.className = "disc";
    var dials = document.createElement("canvas"); dials.width = 560; dials.height = 78; dials.setAttribute("role", "img"); dials.setAttribute("aria-label", "Dials set to the last four digits of your register number");
    var tabs = document.createElement("div"); tabs.className = "row";
    var cv = document.createElement("canvas"); cv.width = 560; cv.height = 300; cv.style.touchAction = "none"; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Your parabola, ellipse or cycloid with marked points");
    var read = document.createElement("div"); read.className = "readout"; read.setAttribute("aria-live", "polite");
    var note = document.createElement("div"); note.className = "small";
    var tick = 0, raf = null, mouse = null;

    function drawDials(f) {
      var c = dials.getContext("2d"); c.clearRect(0, 0, 560, 78);
      var ink = getComputedStyle(document.body).color;
      for (var i = 0; i < 4; i++) {
        var cx = 70 + i * 140, cy = 39, d = +digits.charAt(i) || 0, ang = -Math.PI / 2 + (d / 10) * 2 * Math.PI * f;
        c.strokeStyle = ink; c.globalAlpha = 0.35; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.stroke(); c.globalAlpha = 1;
        for (var k = 0; k < 10; k++) { var q = -Math.PI / 2 + k / 10 * 2 * Math.PI; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(cx + 27 * Math.cos(q), cy + 27 * Math.sin(q)); c.lineTo(cx + 31 * Math.cos(q), cy + 31 * Math.sin(q)); c.stroke(); }
        c.globalAlpha = 1; c.strokeStyle = "#b4442b"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 24 * Math.cos(ang), cy + 24 * Math.sin(ang)); c.stroke();
        c.fillStyle = ink; c.font = "bold 20px system-ui"; c.textAlign = "center"; c.fillText(f >= 1 ? String(d) : String(Math.round(d * f)), cx + 48 + 10, cy + 7);
      }
      c.textAlign = "start";
    }
    function spin() { tick++; var f = Math.min(1, tick / 50); drawDials(f); if (f < 1) raf = requestAnimationFrame(spin); else raf = null; }

    function draw() {
      var s = scene(cur, v), c = cv.getContext("2d"), W = cv.width, H = cv.height, pad = 30, ink = getComputedStyle(document.body).color;
      var sc = Math.min((W - 2 * pad) / (s.x1 - s.x0), (H - 2 * pad) / (s.y1 - s.y0));
      var X = function (x) { return pad + (x - s.x0) * sc; }, Y = function (y) { return H - pad - (y - s.y0) * sc; };
      cv._m = { X: X, Y: Y, sc: sc, s: s };
      c.clearRect(0, 0, W, H); c.font = "11px system-ui";
      var step = nice(60 / sc), x, y;
      c.lineWidth = 1; c.strokeStyle = ink; c.fillStyle = ink;
      for (x = Math.ceil(s.x0 / step) * step; x <= s.x1; x += step) { c.globalAlpha = 0.12; c.beginPath(); c.moveTo(X(x), Y(s.y0)); c.lineTo(X(x), Y(s.y1)); c.stroke(); c.globalAlpha = 0.7; c.fillText(String(Math.round(x * 100) / 100), X(x) - 6, H - 8); }
      for (y = Math.ceil(s.y0 / step) * step; y <= s.y1; y += step) { c.globalAlpha = 0.12; c.beginPath(); c.moveTo(X(s.x0), Y(y)); c.lineTo(X(s.x1), Y(y)); c.stroke(); c.globalAlpha = 0.7; c.fillText(String(Math.round(y * 100) / 100), 2, Y(y) + 4); }
      c.globalAlpha = 0.6; c.beginPath(); c.moveTo(X(s.x0), Y(0)); c.lineTo(X(s.x1), Y(0)); c.moveTo(X(0), Y(s.y0)); c.lineTo(X(0), Y(s.y1)); c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = cur === 0 ? "#1f6f8b" : cur === 1 ? "#7a4fa3" : "#2f7d4f"; c.lineWidth = 2.4; s.curve(c, X, Y);
      s.marks.forEach(function (m) {
        c.fillStyle = "#ffb400"; c.strokeStyle = "#111"; c.lineWidth = 1.5; c.beginPath(); c.arc(X(m.x), Y(m.y), 6, 0, 7); c.fill(); c.stroke();
        if (m.l) { c.fillStyle = ink; c.font = "12px system-ui"; c.fillText(m.l, X(m.x) + 9, Y(m.y) - 9); }
      });
      if (mouse) {
        var hit = null, best = 20;
        s.marks.forEach(function (m) { var d = Math.hypot(X(m.x) - mouse.x, Y(m.y) - mouse.y); if (d < best) { best = d; hit = m; } });
        var wx = hit ? hit.x : s.x0 + (mouse.x - pad) / sc, wy = hit ? hit.y : s.y0 + (H - pad - mouse.y) / sc;
        c.strokeStyle = "#b4442b"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(X(wx), 0); c.lineTo(X(wx), H); c.moveTo(0, Y(wy)); c.lineTo(W, Y(wy)); c.stroke();
        var fx = (hit && hit.e === false && Math.abs(hit.x - Math.round(hit.x)) > 1e-9) ? "≈ " + wx.toFixed(2) : String(Math.round(wx * 100) / 100);
        read.textContent = (hit ? "Marked point:  " : "Crosshair:  ") + "x = " + fx + ",  y = " + (Math.round(wy * 100) / 100);
        read.className = "readout" + (hit ? " snap" : "");
      } else { read.textContent = "Move or touch the picture. The crosshair snaps to the yellow points."; read.className = "readout"; }
      note.textContent = s.note;
    }
    SC.forEach(function (n, i) {
      var b = document.createElement("button"); b.className = "ghost"; b.textContent = n; b.addEventListener("click", function () { cur = i; draw(); }); tabs.appendChild(b);
    });
    function pos(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height }; }
    ["mousemove", "touchmove", "touchstart", "mousedown"].forEach(function (ev) { cv.addEventListener(ev, function (e) { mouse = pos(e); draw(); if (e.cancelable && ev.indexOf("touch") === 0) e.preventDefault(); }, { passive: false }); });
    cv.addEventListener("mouseleave", function () { mouse = null; draw(); });
    var intro = document.createElement("div"); intro.className = "small";
    intro.textContent = "Your register number ends in " + digits + ". The machine turns its four dials to those digits, then draws three curves that belong only to you.";
    var sumNote = document.createElement("div"); sumNote.className = "small"; sumNote.textContent = "Read your numbers off the pictures. Add up the four dial digits for the first box.";
    [intro, dials, sumNote, tabs, cv, read, note].forEach(function (n) { box.appendChild(n); });
    card.appendChild(box);
    draw(); if (opt && opt.done) drawDials(1); else raf = requestAnimationFrame(spin);
  }
  root.PassportDiscover = { attach: attach };
})(window);
