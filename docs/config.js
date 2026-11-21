/* Live watch (optional). Paste your Firebase Realtime Database URL between the quotes, for example
   "https://calculus-passport-default-rtdb.asia-southeast1.firebasedatabase.app"
   Leave it empty to run the activity with no live reporting at all. */
window.PASSPORT_LIVE = { url: "https://calculus-passport-default-rtdb.asia-southeast1.firebasedatabase.app" };

/* Verified email for practice mode (optional). Uses Firebase Authentication "Email link" sign-in.
   apiKey : Firebase console > Project settings > General > Web API key (it is meant to be public).
   domains: allowed email endings, e.g. ["srmist.edu.in"]. An empty list accepts any email address.
   Leave apiKey empty to run practice mode without email sign-in. */
window.PASSPORT_AUTH = { apiKey: "", domains: [] };
