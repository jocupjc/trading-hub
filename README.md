# Trading Hub

A fully integrated, deployable trading workspace:

- **Dashboard** — live performance analytics (equity curves in R and $, per-trade plots, win rate, avg winner/loser, best winner, largest loss, profit factor, avg contracts, avg points, drawdown, green/red/BE days) plus automatic support insights.
- **Trades & PnL** — log every execution (entry time, entry/stop/target/exit price, instrument, contracts). R is auto-computed from prices. Daily result + running cumulative R (plus / minus / break-even).
- **Charts & Screenshots** — store TradingView links and screenshot uploads for every trading day, grouped by year.
- **Daily Journal** — pre-market plan & post-market review, stored per day.
- **OODA Live Journal** — 5-minute Observe / Orient / Decide / Act intraday log.
- **Psychology tools** — your existing standalone tools embedded and reviewable: Committee of Self, Ronin Sequence, Mental Game, Daily Reflection.

Everything persists to **Supabase** (Postgres + storage). Until you configure it, the app transparently uses the browser's **localStorage**, so it works the moment you open it.

---

## Folder structure

```
trading-hub/
  index.html            Dashboard
  css/styles.css        Shared design system
  js/
    config.js           ← put your Supabase URL + anon key here
    supabase-client.js  Data layer (Supabase ⇄ localStorage fallback)
    stats.js            R math + all metrics + auto insights
    shell.js            Sidebar navigation + helpers
    dashboard.js / trades.js / gallery.js / journal.js / ooda.js
  pages/
    trades.html  gallery.html  journal.html  ooda.html  embed.html
  tools/                Your existing standalone journaling tools
    committee-of-self.html  ronin-sequence.html  mental-game.html
    reflection.html  daily-checklist.html  ooda-legacy.html
  supabase/schema.sql   Run this once in Supabase
```

---

## 1. Run locally (no setup)

Open `index.html` in a browser, or serve the folder:

```powershell
cd trading-hub
python -m http.server 5173
# then open http://localhost:5173
```

It works immediately in **local** mode (data stays in that browser).

---

## 2. Connect Supabase (persistent, multi-device)

1. Create a free project at <https://supabase.com>.
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates the tables (`trades`, `trading_days`, `chart_links`, `journal_entries`), the `screenshots` storage bucket, and permissive RLS policies.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.
4. Paste them into `js/config.js`:

   ```js
   window.TH_CONFIG = {
     SUPABASE_URL: 'https://YOURPROJECT.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...',
     ...
   };
   ```

5. Reload. The sidebar badge switches from **Local (offline)** to **Supabase cloud**.

> The anon key is designed to be public in client apps. Security is enforced by Row Level Security. The schema ships with permissive single-user policies — if you later add Supabase Auth, tighten them to `auth.uid() = user_id`.

---

## 3. Deploy to GitHub Pages

This is a static site — no build step.

1. Create a GitHub repo and push the `trading-hub/` contents to the repo root (or keep the folder and set Pages to serve it).
2. **Repo → Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` → `/root` (or `/docs`).
3. Your site goes live at `https://USERNAME.github.io/REPO/`.

Because `js/config.js` holds only the public URL + anon key, it's safe to commit. If you'd rather not commit it, keep a `config.js` locally and add it to `.gitignore` (the app still runs in local mode without it).

---

## Data model notes

- **R convention:** a full loss = **-1R**. `R = (exit − entry) / |entry − stop|` for longs (inverted for shorts). If you don't enter prices, type the R result directly.
- **Largest loss** should read ≈ **-1R** — the dashboard flags it if a stop was widened.
- **$ PnL** is optional; enter it to get the $ equity curve alongside R.
- **Journal tools** save their full state as JSON under `journal_entries(date, type)`.

## Migrating existing localStorage data

The embedded tools (Committee, Ronin, Mental Game, Reflection) keep using their own localStorage keys, so any history you already have in the original files is preserved when you open them here — just make sure you open them in the **same browser**.
