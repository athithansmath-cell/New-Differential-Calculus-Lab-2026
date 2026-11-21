/* auth.js - verified email for practice mode, using Firebase Authentication email-link sign-in over REST.
   No SDK. The student types an email, Firebase mails a one-time link, and opening that link proves
   they own the address. The result is kept on this device and written into the submission file.
   Nothing about a student is stored on any server except in the Firebase project's own Authentication list. */
(function (root) {
  "use strict";
  var cfg = root.PASSPORT_AUTH || {};
  var KEY = String(cfg.apiKey || "").trim();
  var DOMAINS = (cfg.domains || []).map(function (d) { return String(d).toLowerCase().replace(/^@/, ""); });
  var LS_PENDING = "passport-auth-pending", LS_OK = "passport-auth-ok";
  var BASE = "https://identitytoolkit.googleapis.com/v1/accounts:";

  var MSG = {
    INVALID_EMAIL: "That email address does not look right.",
    OPERATION_NOT_ALLOWED: "Email-link sign-in is not switched on in the Firebase project yet. Tell your teacher.",
    UNAUTHORIZED_DOMAIN: "This web address is not authorised in the Firebase project yet. Tell your teacher.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many tries. Wait a few minutes and try again.",
    QUOTA_EXCEEDED: "Too many sign-in emails were sent today. Try again later or tell your teacher.",
    INVALID_OOB_CODE: "This sign-in link has already been used or is not valid. Ask for a new link.",
    EXPIRED_OOB_CODE: "This sign-in link has expired. Ask for a new link.",
    INVALID_EMAIL_LINK: "The email you typed is not the one the link was sent to."
  };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function post(method, body) {
    return root.fetch(BASE + method + "?key=" + encodeURIComponent(KEY), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
      if (x.ok) return x.j;
      var code = String((x.j && x.j.error && x.j.error.message) || "ERROR").split(" ")[0];
      var e = new Error(MSG[code] || "Sign-in failed (" + code + "). Try again or tell your teacher."); e.code = code; throw e;
    }, function () { throw new Error("No internet connection. Connect and try again."); });
  }
  function normEmail(e) { return String(e || "").trim().toLowerCase(); }
  function allowed(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email address does not look right.";
    if (DOMAINS.length && DOMAINS.indexOf(email.split("@")[1]) < 0) return "Use your college email address (ending in " + DOMAINS.map(function (d) { return "@" + d; }).join(" or ") + ").";
    return "";
  }
  function pageUrl() { return root.location.origin + root.location.pathname; }

  var api = {
    enabled: function () { return !!KEY; },
    domains: function () { return DOMAINS.slice(); },
    normEmail: normEmail, allowed: allowed,
    /* returns {email, token, at} when this device already holds a verified email */
    verified: function () { var v = lsGet(LS_OK); return v && v.email && v.token ? v : null; },
    forget: function () { lsSet(LS_OK, null); },
    pending: function () { return lsGet(LS_PENDING); },
    send: function (email, extra) {
      email = normEmail(email);
      var bad = allowed(email); if (bad) return Promise.reject(new Error(bad));
      return post("sendOobCode", { requestType: "EMAIL_SIGNIN", email: email, continueUrl: pageUrl(), canHandleCodeInApp: true }).then(function () {
        lsSet(LS_PENDING, { email: email, extra: extra || null, at: Date.now() });
        return email;
      });
    },
    /* the page was opened from the emailed link */
    linkInUrl: function () {
      var q = new root.URLSearchParams(root.location.search);
      return q.get("mode") === "signIn" && q.get("oobCode") ? q.get("oobCode") : null;
    },
    complete: function (email, oob) {
      email = normEmail(email);
      return post("signInWithEmailLink", { email: email, oobCode: oob }).then(function (j) {
        if (normEmail(j.email) !== email) throw new Error(MSG.INVALID_EMAIL_LINK);
        var v = { email: email, token: j.idToken, at: Date.now() };
        lsSet(LS_OK, v); lsSet(LS_PENDING, null);
        try { root.history.replaceState(null, "", pageUrl()); } catch (e) {}
        return v;
      });
    }
  };
  root.PassportAuth = api;
})(typeof window !== "undefined" ? window : globalThis);
