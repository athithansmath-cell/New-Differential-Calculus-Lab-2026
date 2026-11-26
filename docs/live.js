/* live.js - optional live reporting to a Firebase Realtime Database (REST, no SDK).
   Roster students: sends only an anonymous student code, online flag, confirmed part ids with server time,
   and wrong-attempt counts per task. No names, no answers, no working. Practice students (opt-in form) also send their name and register number, under /practice. */
(function (root) {
  "use strict";
  var cfg = root.PASSPORT_LIVE || {};
  var base = String(cfg.url || "").replace(/\/+$/, "");
  var key = null, pre = "live", hb = null, SV = { ".sv": "timestamp" };

  function send(path, method, body) {
    if (!base || !key) return;
    try {
      root.fetch(base + "/" + pre + "/" + key + path + ".json", {
        method: method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), keepalive: true
      }).catch(function () {});
    } catch (e) { /* the activity must never break because the network did */ }
  }

  var api = {
    enabled: function () { return !!base; },
    start: function (k, solved, tries, meta) {
      if (!base) return;
      if (meta && !meta.pre && cfg.practice === false) return;
      key = k; pre = (meta && meta.pre) || (meta ? "practice" : "live");
      var s = {}, w = {}, id;
      for (id in solved) if (solved[id] != null) s[id] = SV;
      for (id in tries) if (tries[id]) w[id] = tries[id];
      var first = { t: SV, o: 1, s: s, w: w };
      if (meta) { first.n = String(meta.n || "").slice(0, 60); first.r = String(meta.r || "").slice(0, 30); if (meta.extra) Object.keys(meta.extra).forEach(function (f) { first[f] = meta.extra[f]; }); }
      send("", "PATCH", first);
      clearInterval(hb);
      hb = setInterval(function () { send("", "PATCH", { t: SV, o: 1 }); }, 30000);
      if (root.addEventListener) root.addEventListener("pagehide", api.stop);
    },
    solved: function (partId) { var o = {}; o[partId] = SV; send("/s", "PATCH", o); send("", "PATCH", { t: SV }); },
    tries: function (taskId, n) { var o = {}; o[taskId] = n; send("/w", "PATCH", o); },
    /* generic helpers used by the exam pages: patch top-level fields, or one entry inside a field (v, l, mk) */
    patch: function (o) { var b = {}; Object.keys(o).forEach(function (k) { b[k] = o[k] === "now" ? SV : o[k]; }); b.t = SV; send("", "PATCH", b); },
    mark: function (field, id, val) { var o = {}; o[id] = val === undefined ? SV : val; send("/" + field, "PATCH", o); send("", "PATCH", { t: SV }); },
    stop: function () { if (!key) return; clearInterval(hb); hb = null; send("", "PATCH", { t: SV, o: 0 }); key = null; }
  };
  root.PassportLive = api;
})(typeof window !== "undefined" ? window : globalThis);
