# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

The primary product lives in `dekel-boq/` — a **static, client-side web app** ("דקל כמויות") that
converts a Dekel construction price catalog (PDF / Excel / CSV / TXT / DXF) into an editable
Excel bill-of-quantities (BOQ). It is plain HTML/CSS/vanilla-JS ES modules with **no build step,
no package manager, and no automated test or lint tooling**. All logic is in `dekel-boq/js/`
(`app.js`, `parser.js`, `excel.js`).

Note: the repo-root `index.html` is an unrelated privacy-policy page and is NOT part of the app.

### Running it (dev)

Because it uses ES modules and `fetch`, it must be served over HTTP — opening `index.html` via
`file://` will not work. Serve the repo root and open the app path:

- `python3 -m http.server 8000` (run from the repo root), then open
  `http://localhost:8000/dekel-boq/index.html`.

There is no separate production build; "dev" and "prod" are the same static files.

### Non-obvious gotchas

- **CDN runtime dependencies require network egress.** Excel import/export uses SheetJS
  (`https://cdn.sheetjs.com/...`) loaded in `dekel-boq/index.html`, and PDF parsing dynamically
  imports pdf.js (`https://cdnjs.cloudflare.com/...`) in `parser.js`. The app's core flow (load
  sample, edit quantities, see totals) works offline, but **Excel export and PDF parsing fail if
  those CDNs are blocked**. If export throws "ספריית Excel לא נטענה", the SheetJS CDN was not
  reachable.
- Quick end-to-end smoke test: open the app, click **דוגמה** (loads 10 sample rows), then click
  **ייצוא Excel** — a `*.xlsx` with two sheets (`כמויות`, `סיכום`) downloads.
- There are no tests/linters to run; validate changes by exercising the UI in a browser.
