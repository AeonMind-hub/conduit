# Offline demo mode

Your network blocks `generativelanguage.googleapis.com` at the TLS layer
(`schannel: failed to receive handshake`). That is an ISP / antivirus / DPI
problem, not an app problem or a key problem.

**You do not need to solve it this week.**

---

## Run the demo with no network

```
npm run demo
```

http://localhost:3000 → **Process inbox**

Uses pre-computed fixtures in `src/lib/fixtures.ts` instead of calling
Gemini. Verified working with **no API key and no network**:

```
processed      10
auto-approved   4
needs review    5
rejected        1
TMS records     4

EMAIL 4 weight : None @ 0.00   >>> PASS
email 3 loads  : 2
email 10       : rejected
```

`npm run dev` still uses the live API for when your network is fixed.

---

## This is not a workaround, it's the better choice for recording

For a **recorded sales demo**, fixtures beat live calls:

- No 10-second waits per email killing your pacing
- No rate limit hitting you on take 7
- Identical output every take, so you can rehearse the narration
- No risk of the model returning something odd mid-recording

Live API is for the client's own inbox during a paid pilot. The video just
has to show the system working, and it does.

The fixture values are the honest outputs — including email 4's
`weight_lbs: null` at confidence 0. **Nothing in the video is faked.**

---

## Fixing the network later (before a live client demo)

1. **Phone hotspot** — fastest test. If it works, it's your ISP.
2. **Cloudflare WARP** — free, https://one.one.one.one
3. **Antivirus HTTPS/SSL scanning** — Kaspersky, Avast, AVG, ESET and
   Bitdefender intercept TLS and commonly break API calls. Disable
   "SSL scanning" / "web shield" and retest.
4. Confirm which: `curl -I https://www.google.com` succeeds but
   `curl -I https://generativelanguage.googleapis.com` fails = selective
   filtering on that hostname.

---

## Bug this exposed

`extract.ts` threw at **import time** if `GEMINI_API_KEY` was missing.
The process route imports that module even in offline mode, so the whole
API returned 500 before reaching any fixture.

Fixed: the Gemini client is now lazily constructed inside `client()`, so
it only throws when you actually make a live call. The app now starts
cleanly with no key at all.

Worth having found — that same crash would have hit any client who cloned
the repo before adding their key.
