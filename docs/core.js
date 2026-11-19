/* core.js - pure functions (hashing, answer parsing). Works in the browser and in Node. */
(function (root) {
  "use strict";

  /* ---- SHA-256 (no dependencies, works on file:// and http://) ---- */
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

  function utf8(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
        c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function sha256(str) {
    var bytes = utf8(str), l = bytes.length, i, j;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var bits = l * 8;
    for (i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
    var H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    var w = new Uint32Array(64);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < bytes.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (bytes[i + 4 * j] << 24) | (bytes[i + 4 * j + 1] << 16) | (bytes[i + 4 * j + 2] << 8) | bytes[i + 4 * j + 3];
      for (j = 16; j < 64; j++) {
        var s0 = rr(w[j - 15], 7) ^ rr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rr(w[j - 2], 17) ^ rr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    var hex = "";
    for (i = 0; i < 8; i++) hex += ("00000000" + H[i].toString(16)).slice(-8);
    return hex;
  }

  /* ---- register number / answer handling ---- */
  function normReg(r) { return String(r || "").replace(/\s+/g, "").toUpperCase(); }

  function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }

  /* "3/4", "-1.25", "−7", "12" -> "n/d" in lowest terms, or null if not a plain fraction/decimal */
  function parseAnswer(raw) {
    var s = String(raw == null ? "" : raw).replace(/−|–|—/g, "-").replace(/\s+/g, "");
    if (!s) return null;
    var num, den, m;
    if ((m = /^([+-]?)(\d+)\/(\d+)$/.exec(s))) {
      num = BigInt(m[2]); den = BigInt(m[3]); if (m[1] === "-") num = -num;
    } else if ((m = /^([+-]?)(\d*)\.?(\d*)$/.exec(s)) && (m[2] || m[3])) {
      var frac = m[3] || "";
      num = BigInt((m[2] || "0") + frac); den = 10n ** BigInt(frac.length); if (m[1] === "-") num = -num;
    } else return null;
    if (den === 0n) return null;
    var g = gcd(num, den) || 1n;
    num /= g; den /= g;
    if (num === 0n) den = 1n;
    return num.toString() + "/" + den.toString();
  }

  function answerHash(salt, regno, taskId, idx, canon) {
    return sha256(salt + "|" + regno + "|" + taskId + "|" + idx + "|" + canon).slice(0, 16);
  }
  function studentKey(salt, regno) { return sha256(salt + "|" + regno).slice(0, 12); }

  /* stamp for a set of solved parts, e.g. ["1.1:0","1.2:0","1.2:1"] */
  function stamp(salt, regno, period, solvedIds) {
    var ids = solvedIds.slice().sort().join(",");
    var h = sha256(salt + "|" + regno + "|stamp|" + period + "|" + ids).slice(0, 8).toUpperCase();
    return h.slice(0, 4) + "-" + h.slice(4);
  }

  var api = { sha256: sha256, normReg: normReg, parseAnswer: parseAnswer, answerHash: answerHash, studentKey: studentKey, stamp: stamp };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PassportCore = api;
})(typeof window !== "undefined" ? window : globalThis);
