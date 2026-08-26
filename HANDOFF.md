# Trading Hub — Project Handoff

A fully integrated trading web app: trade journal, daily journals (pre/post/OODA),
psychology tools, running PnL/analytics dashboard. Vanilla HTML/CSS/JS, Supabase
backend, hosted on GitHub Pages.

- **Live:** https://jocupjc.github.io/trading-hub/
- **Repo:** https://github.com/jocupjc/trading-hub (branch `main`)
- **Local workspace:** `c:\Users\jcuhls\.copilot\trading-hub\`

---

## 1. Tech stack & conventions

- **Frontend:** Plain HTML/CSS/JS, no build step. Deploy files as-is.
- **Auth:** Supabase email/password. `js/auth.js` exposes `Auth.ready` (promise),
  `Auth.userId`, `Auth.email`, sign in/up/out. A login overlay gates the app.
- **Data:** `js/supabase-client.js` exposes the `DB` object (Supabase + localStorage
  fallback). Per-user rows via `user_id` (RLS). `DB.ownerId()` reads `window.Auth.userId`.
- **Config:** `js/config.js` sets `window.TH_CONFIG` (Supabase URL + anon key).
  - `SUPABASE_URL = https://ncsyrwuncvtaqxjsqiig.supabase.co`
- **Cache-busting:** every local asset is referenced with `?v=N`. **When you change a
  file, bump its `?v=` in every HTML that references it.**

### Current asset versions (keep in sync when editing)
| File | Version |
|------|---------|
| css/styles.css | v3 |
| js/config.js | v3 |
| js/supabase-client.js | v6 |
| js/stats.js | v3 |
| js/auth.js | v3 |
| js/shell.js | **v8** |
| js/dashboard.js | v4 |
| js/trades.js | v6 |
| js/daily.js | **v13** |

---

## 2. Supabase

- Tables (all with `user_id` + RLS):
  - `trades`, `trading_days`, `chart_links` (has `trade_id` column), `journal_entries`.
  - `journal_entries` PK = `(date, type)`. Types used: `daily` (pre+post+prep+red flags
    +box checklists), `ooda` (OODA grid).
- Storage bucket: `screenshots`.
- Migrations live in `supabase/schema.sql`, `auth.sql`, `trade-links.sql` (already applied).
- Run SQL/maintenance from the live page via `window.supabase.createClient(cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY)` inside `page.evaluate` (reuses the logged-in session). The
  Supabase dashboard SPA renders blank in the integrated browser — don't rely on it.

---

## 3. File map (`trading-hub/`)

- **index.html** + **js/dashboard.js** — Dashboard: equity curve (R), every-trade (R),
  scatter. Charts wrapped in `.chart-box` (fixed 190px height). Uses `js/stats.js`
  (R metrics, insights; loss = -1R).
- **pages/trades.html** + **js/trades.js** — Trade entry with an embedded per-trade
  Charts & Screenshots panel (tied to `trade_id`).
- **pages/journal.html** + **js/daily.js** — THE MAIN ACTIVE PAGE (see §5).
- **js/shell.js** — Sidebar nav (`NAV` array) + shared helpers (`esc`, `Shell.mount`,
  `Shell.toast`). Nav order: **Daily journal → Overview (Dashboard, Trades & PnL) →
  Psychology**.
- **tools/** — psychology HTMLs embedded via `pages/embed.html?tool=X`:
  committee-of-self, ronin-sequence, mental-game, reflection (+ daily-checklist,
  ooda-legacy). `tools/ronin-sequence.html` is the source of truth for the Ronin
  content ported into the Daily Journal.
- **Orphaned (in repo, unlinked):** `pages/ooda.html`+`js/ooda.js`,
  `pages/gallery.html`+`js/gallery.js`, `js/journal.js`. Safe to delete if desired.

---

## 4. Deploy workflow (IMPORTANT — no terminal git)

Terminal `git push` is wedged (Git Credential Manager). **Deploy by uploading changed
files through GitHub's web UI via Playwright**, on browser page for github.com:

1. `page.goto('https://github.com/jocupjc/trading-hub/upload/main/<subfolder>')`
   (use `/upload/main` for root, `/upload/main/js`, `/upload/main/pages`, etc.).
2. `page.setInputFiles('#upload-manifest-files-input', [<absolute local paths>])`.
3. `page.fill('input[name="message"]', '<commit msg>')`.
4. Commit with `page.evaluate(() => document.querySelector('button.js-blob-submit').click())`
   (NOT a Playwright click — that hits hidden remove buttons).
5. One upload per subfolder (a single upload can't span multiple folders).

**Propagation:** GitHub Pages rebuild takes ~1–3 min. Verify by fetching with a
cache-bust from inside `page.evaluate`:
`fetch('https://jocupjc.github.io/trading-hub/js/daily.js?t=' + Date.now())`.
(`fetch` is not defined in the raw Playwright node context — always wrap in
`page.evaluate`.)

**Gotcha — intermittent "Failed to deploy":** GitHub Pages builds sometimes show
"Failed to deploy (completed)" at `/deployments`. The commit still lands in the repo
(verify via `raw.githubusercontent.com/.../main/...`). Fix by pushing one more trivial
commit (e.g. bump a `?v=`) to trigger a fresh build; a later successful build publishes
the current `main` state.

**Verification quirks:** the integrated browser's `getComputedStyle` is unreliable for
colors — verify via element `className`/dataset or screenshots instead.

---

## 5. Daily Journal (`pages/journal.html` + `js/daily.js`) — current structure

Single `#j-date` picker + "Save day" button + `#save-status`. Five collapsible
`.jsection` cards (`.sec-head` click toggles `.collapsed`). **Auto-save**: instant
localStorage drafts (`th:draft:<type>:<date>`) + 500ms-debounced cloud push
(`persistDate`), plus flush on date-change/archive-open/pagehide/visibilitychange.
Delegated listeners on `main` fire autosave for `input/change` and clicks on
`.tog, .scale-btn, .ab, .cl-item, .rf-item`.

### Section order
1. **Pre-market — the plan**: check-in checkboxes; Mental State Check (emotion toggle
   group `#grp-emotion`, 1–10 intensity scale, contextual Tendler alert boxes,
   `#pre-trigger`); A/B/C Game (`#grp-game`, `#pre-cgame`); Warm-up checklist
   (`pre-w1..pre-w8`); Tagesintention (`#pre-goal/#pre-risk/#pre-mantra`). Content is
   ported 1:1 from the Mental Game guide (German).
2. **Pre-trade prep** — see below (this is where all recent Ronin work lives).
3. **OODA live** — 5-min time-grid table (`#obody`), Observe/Orient/Algo/Action/Body/Mind.
4. **Post-market — the review** — rule-compliance, process score, best/worst/emotion/tomorrow.
5. **Saved days** — archive table (open past days; shows OODA ✓).

Plus a "Deep-dive psychology tools" card linking the embedded tools.

### Pre-trade prep contents (top → bottom)
1. **Red Flags** (ported 1:1 from Ronin) — items are `.rf-item[data-rf]`, click to toggle
   `.on` + a tone class. Groups & tones:
   - **Model Signal**: `rcModel` (green), `rxModel` (red) → badge: rc=🟢 GREEN LIGHT,
     rx=🔴 RED LIGHT, both=CAUTION.
   - **Caution** (yellow): `news` (with tag-chip input `#rf-news-tags`), `insideWdr`,
     `weeklyRcModel`, `wdrrbFalseDay`, `adrHalfDisagree`, `tripleFalseOdr` → "N caution".
   - **Outside Day Signal** (blue): `yesterdayInsideDay` → "↔ OUTSIDE DAY PROBABLE".
   - **Reversal Signal** (orange): `wdrrbQ37`, `turnaroundThursday` → "↻ REVERSAL LIKELY".
   - **Amplifiers** (gray): `noWdrrbBreakout`, `brokenAdr`, `adrCombDdrMin`,
     `adrSpanningWdrrbMid`, `multiFalseDay` → "N amplifier(s)".
   - Badges/counts render in `#rf-badges` (top of the block). Logic in `updateRfBadges()`.
   - State saved as `rf-<key>` (bool) + `rf-news-tags` (array).
2. **0230 – 0400 ODR Box Formation** (`data-box2`, summary `#box2-summary`).
3. **Directional bias** (the 3 points): `.cl-item[data-prep]` = `pre-market-state`
   (third=C), `pre-vvwap` (third=N), `pre-sequence` (third=N). Click cycles
   empty→U→D→third→empty. Bias badge in section header `#prep-summary`.
4. **0930 – 1030 Box Formation** (`data-box`, summary `#box-summary`).

### Box Formation checklists (both instances, ported 1:1 from Ronin)
Two independent instances driven by `BOX_SETS = [{attr:'box',summary:'box-summary'},
{attr:'box2',summary:'box2-summary'}]`. Same content for each:
- **Directional** (cycle U→D→N→empty): `monthly, weekly*, daily, rdr, dailyModel*,
  partials, ddrComSym, ddrSepMinMin, gaps, ass, vwap, svpHtf` (`BOX_CYCLE`).
- **Checks** (toggle ✓): `markTime, svpLtf, vibsH1m30, confluencesCheck, rdrModel*,
  markMakeOrBreak, checkDdr, markTargets, transitionHL (yellow), wdrrbOpen, chaining`
  (`BOX_CHECK`).
- `*` = has a model-tag text input (`data-<attr>-model`); keys in `BOX_MODEL_KEYS =
  [weekly, dailyModel, rdrModel]`. `transitionHL` uses `data-yellow="1"` → yellow highlight.
- Overview badge (top-right of each block) shows `▲ UP BIAS / ▼ DOWN BIAS` + `nU nD nN n✓`,
  winning side highlighted. Logic in `updateBoxSummary(attr, summaryId)`; item state via
  `setBoxState(item, state)`; read/fill iterate `BOX_SETS`.
- State saved as `<attr>-<key>` and `<attr>-model-<key>`.
- All boxes reuse the same `.cl-grid` / `.cl-item` layout as the 3 directional-bias points.

### Key daily.js internals
- `JFIELDS` (textarea/select value fields), `CHECK_FIELDS` (checkboxes).
- `readJournal()` / `fillJournal(p)` serialize/restore EVERYTHING above.
- Groups/scale: `groupValue/setGroupValue`, `scaleValue/setScaleValue`; alerts
  `emotionAlert/gameAlert/intensityAlert` (German Tendler text).
- Prep items: `setPrepState/updatePrepSummary`. Red flags: `rfOn/setRf/updateRfBadges/
  renderNewsTags`. Boxes: `boxItem/boxStateOf/setBoxState/updateBoxSummary`.
- OODA: `buildRows/renderTable/collectOoda/highlightNow`.
- Persistence: `writeDrafts/clearDrafts/scheduleAutosave/persistDate/load/renderArchive`.

---

## 6. Testing hygiene (do this every time you verify live)
- Never write test data to a real date. Use throwaway date **`2000-01-01`**, then delete:
  ```js
  await page.evaluate(async () => {
    const cfg = window.TH_CONFIG;
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    await sb.auth.getSession();
    await sb.from('journal_entries').delete().eq('date', '2000-01-01');
    localStorage.removeItem('th:draft:daily:2000-01-01');
    localStorage.removeItem('th:draft:ooda:2000-01-01');
  });
  ```
- After testing, move the live page's date picker back to today so autosave can't
  re-persist the throwaway date.
- Delete any temporary screenshot files you create.

---

## 7. Browser pages typically shared
- github.com page (id varies) — used for deploy uploads.
- Live app page (id varies) — used for verification (log in as the app user first).

---

## 8. Status
All requested features are complete and live: login + per-user data, dashboard
(equity/scatter/bars + stats + insights), per-trade charts, and the merged collapsible
Daily Journal with 1:1 Mental Game content, Ronin **Red Flags**, **Directional bias**,
and **two Box Formation checklists** (0230–0400 + 0930–1030) with overviews, cycling,
checks, yellow highlights, and model tags — all auto-saving per day. No known open bugs.
