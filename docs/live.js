/* live.js - optional live reporting to a Firebase Realtime Database (REST, no SDK).
   Sends only: an anonymous student code, online flag, confirmed part ids with server time,
   and wrong-attempt counts per task. No names, no register numbers, no answers, no working. */
(function (root) {
  "use strict";
  var cfg = root.PASSPORT_LIVE || {};
  var base = String(cfg.url || "").replace(/\/+$/, "");
  var key = null, hb = null, SV = { ".sv": "timestamp" };

  function send(path, method, body) {
    if (!base || !key) return;
    try {
      root.fetch(base + "/live/" + key + path + ".json", {
        method: method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), keepalive: true
      }).catch(function () {});
    } catch (e) { /* the activity must never break because the network did */ }
  }

  var api = {
    enabled: function () { return !!base; },
    start: function (k, solved, tries) {
      if (!base) return;
      key = k;
      var s = {}, w = {}, id;
      for (id in solved) if (solved[id] != null) s[id] = SV;
      for (id in tries) if (tries[id]) w[id] = tries[id];
      send("", "PATCH", { t: SV, o: 1, s: s, w: w });
      clearInterval(hb);
      hb = setInterval(function () { send("", "PATCH", { t: SV, o: 1 }); }, 30000);
      if (root.addEventListener) root.addEventListener("pagehide", api.stop);
    },
    solved: function (partId) { var o = {}; o[partId] = SV; send("/s", "PATCH", o); send("", "PATCH", { t: SV }); },
    tries: function (taskId, n) { var o = {}; o[taskId] = n; send("/w", "PATCH", o); },
    stop: function () { if (!key) return; clearInterval(hb); hb = null; send("", "PATCH", { t: SV, o: 0 }); key = null; }
  };
  root.PassportLive = api;
})(typeof window !== "undefined" ? window : globalThis);
