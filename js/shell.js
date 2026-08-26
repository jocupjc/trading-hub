// ─────────────────────────────────────────────────────────────────────────────
// App shell — injects the sidebar nav into every page and exposes shared helpers.
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { group: 'Daily journal' },
  { href: 'pages/journal.html', icon: '✎', label: 'Daily Journal' },
  { group: 'Overview' },
  { href: 'index.html', icon: '◧', label: 'Dashboard' },
  { href: 'pages/trades.html', icon: '⤢', label: 'Trades & PnL' },
  { group: 'Psychology' },
  { href: 'pages/embed.html?tool=committee-of-self&title=Committee%20of%20Self', icon: '❂', label: 'Committee of Self' },
  { href: 'pages/embed.html?tool=ronin-sequence&title=Ronin%20Sequence', icon: '⌘', label: 'Ronin Sequence' },
  { href: 'pages/embed.html?tool=mental-game&title=Mental%20Game', icon: '☯', label: 'Mental Game' },
  { href: 'pages/embed.html?tool=reflection&title=Daily%20Reflection', icon: '❖', label: 'Daily Reflection' },
];

const Shell = {
  // rel = path prefix back to the trading-hub root ('' for root, '../' for /pages)
  render(activeHref, rel = '') {
    const backend = DB.active() === 'supabase'
      ? '<span class="backend cloud"><span class="dot"></span>Supabase cloud</span>'
      : '<span class="backend local"><span class="dot"></span>Local (offline)</span>';

    const items = NAV.map(n => {
      if (n.group) return `<div class="group-label">${n.group}</div>`;
      const active = n.href === activeHref ? ' active' : '';
      return `<a class="nav-link${active}" href="${rel}${n.href}"><span class="ic">${n.icon}</span>${n.label}</a>`;
    }).join('');

    return `
      <aside class="sidebar">
        <button class="nav-collapse" id="nav-collapse" title="Hide navigation" aria-label="Hide navigation">‹</button>
        <div class="brand">
          <div class="mark">Trading Hub</div>
          <div class="sub">Journal · Trades · Analytics</div>
          <div class="backend-wrap">${backend}</div>
          <div id="account" class="account"></div>
        </div>
        <nav class="nav">${items}</nav>
      </aside>
      <button class="nav-open" id="nav-open" title="Show navigation" aria-label="Show navigation">☰</button>`;
  },

  mount(activeHref, rel = '') {
    DB.initSupabase();
    const host = document.getElementById('shell');
    if (host) host.innerHTML = this.render(activeHref, rel);
    this.initNavToggle();
    if (window.Auth && Auth.refresh) Auth.refresh();
  },

  initNavToggle() {
    const app = document.querySelector('.app');
    if (!app) return;
    const KEY = 'th:nav-collapsed';
    const set = (v) => { app.classList.toggle('nav-collapsed', v); localStorage.setItem(KEY, v ? '1' : '0'); };
    set(localStorage.getItem(KEY) === '1');
    const c = document.getElementById('nav-collapse');
    const o = document.getElementById('nav-open');
    if (c) c.addEventListener('click', () => set(true));
    if (o) o.addEventListener('click', () => set(false));
  },

  toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
  },
};

// Shared formatting helpers
const fmtR = (v) => (v > 0 ? '+' : '') + (Number(v).toFixed(2)) + 'R';
const fmtD = (v) => (v > 0 ? '+' : '') + '$' + Number(v).toFixed(2);
const cls = (v) => (v > 0.001 ? 'pos' : v < -0.001 ? 'neg' : 'neu');
const todayStr = () => new Date().toISOString().slice(0, 10);
const esc = (s) => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

window.Shell = Shell;
