// ─────────────────────────────────────────────────────────────────────────────
// App shell — injects the sidebar nav into every page and exposes shared helpers.
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { group: 'Daily journal' },
  { href: 'pages/journal.html', icon: '✎', label: 'Daily Journal' },
  { group: 'Overview', collapsible: true },
  { href: 'index.html', icon: '◧', label: 'Dashboard' },
  { href: 'pages/trades.html', icon: '⤢', label: 'Trades & PnL' },
  { group: 'DDR calendar', collapsible: true },
  { href: 'pages/calendar.html?type=ddr&inst=NQ', icon: '▤', label: 'NQ' },
  { href: 'pages/calendar.html?type=ddr&inst=ES', icon: '▤', label: 'ES' },
  { href: 'pages/calendar.html?type=ddr&inst=CL', icon: '▤', label: 'CL' },
  { group: 'WDDRS calendar', collapsible: true },
  { href: 'pages/calendar.html?type=wddrs&inst=NQ', icon: '▤', label: 'NQ' },
  { href: 'pages/calendar.html?type=wddrs&inst=ES', icon: '▤', label: 'ES' },
  { href: 'pages/calendar.html?type=wddrs&inst=CL', icon: '▤', label: 'CL' },
  { group: 'Psychology', collapsible: true },
  { href: 'pages/embed.html?tool=committee-of-self&title=Committee%20of%20Self', icon: '❂', label: 'Committee of Self' },
  { href: 'pages/embed.html?tool=ronin-sequence&title=Ronin%20Sequence', icon: '⌘', label: 'Ronin Sequence' },
  { href: 'pages/embed.html?tool=mental-game&title=Mental%20Game', icon: '☯', label: 'Mental Game' },
  { href: 'pages/embed.html?tool=reflection&title=Daily%20Reflection', icon: '❖', label: 'Daily Reflection' },
  { group: 'Calm' },
  { breathe: true, icon: '◯', label: 'Breathe' },
];

const Shell = {
  // rel = path prefix back to the trading-hub root ('' for root, '../' for /pages)
  render(activeHref, rel = '') {
    const backend = DB.active() === 'supabase'
      ? '<span class="backend cloud"><span class="dot"></span>Supabase cloud</span>'
      : '<span class="backend local"><span class="dot"></span>Local (offline)</span>';

    let items = '';
    let openGroup = false;
    NAV.forEach(n => {
      if (n.group) {
        if (openGroup) { items += '</div>'; openGroup = false; }
        if (n.collapsible) {
          const gid = n.group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          items += `<button class="group-label group-toggle" data-navgroup="${gid}"><span>${n.group}</span><span class="nav-chev">▾</span></button>`;
          items += `<div class="nav-group-items" data-navgroup-items="${gid}">`;
          openGroup = true;
        } else {
          items += `<div class="group-label">${n.group}</div>`;
        }
        return;
      }
      if (n.breathe) { items += `<a class="nav-link" href="#" data-breathe><span class="ic">${n.icon}</span>${n.label}</a>`; return; }
      const active = n.href === activeHref ? ' active' : '';
      items += `<a class="nav-link${active}" href="${rel}${n.href}"><span class="ic">${n.icon}</span>${n.label}</a>`;
    });
    if (openGroup) items += '</div>';

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
      <button class="nav-open" id="nav-open" title="Show navigation" aria-label="Show navigation">☰</button>
      <button class="breathe-fab" data-breathe title="Guided diaphragmatic breathing" aria-label="Breathe"></button>`;
  },

  mount(activeHref, rel = '') {
    DB.initSupabase();
    const host = document.getElementById('shell');
    if (host) host.innerHTML = this.render(activeHref, rel);
    this.injectNavStyles();
    this.initNavToggle();
    this.initNavGroups();
    this.initBreathe();
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

  injectNavStyles() {
    if (document.getElementById('nav-styles')) return;
    const s = document.createElement('style');
    s.id = 'nav-styles';
    s.textContent = `
      .group-toggle { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; background:none; border:none; cursor:pointer; text-align:left; font-family:var(--mono); font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:var(--mu); padding:12px 12px 4px; }
      .group-toggle:hover { color:var(--tx); }
      .group-toggle .nav-chev { font-size:11px; transition:transform .15s; }
      .group-toggle.collapsed .nav-chev { transform:rotate(-90deg); }
      .nav-group-items { display:flex; flex-direction:column; gap:2px; }
      .nav-group-items.collapsed { display:none; }`;
    document.head.appendChild(s);
  },

  initNavGroups() {
    document.querySelectorAll('.group-toggle').forEach(btn => {
      const id = btn.dataset.navgroup;
      const items = document.querySelector(`[data-navgroup-items="${id}"]`);
      if (!items) return;
      const KEY = 'th:navgroup:' + id;
      const set = (collapsed) => {
        btn.classList.toggle('collapsed', collapsed);
        items.classList.toggle('collapsed', collapsed);
        localStorage.setItem(KEY, collapsed ? '1' : '0');
      };
      set(localStorage.getItem(KEY) === '1');
      btn.addEventListener('click', () => set(!items.classList.contains('collapsed')));
    });
  },

  initBreathe() {
    Breathe.injectStyles();
    document.querySelectorAll('[data-breathe]').forEach(el =>
      el.addEventListener('click', e => { e.preventDefault(); Breathe.open(); }));
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

// ── Guided diaphragmatic breathing overlay ───────────────────────────────────
const Breathe = {
  running: false, timer: null, countdown: null, REQUIRED: 6, rounds: 0, locked: false,
  phases: [
    { name: 'Breathe in', dur: 4, scale: 1.6 },
    { name: 'Hold', dur: 2, scale: 1.6 },
    { name: 'Breathe out', dur: 6, scale: 1 },
  ],
  injectStyles() {
    if (document.getElementById('breathe-styles')) return;
    const s = document.createElement('style');
    s.id = 'breathe-styles';
    s.textContent = `
      .breathe-top { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:var(--r); border:.5px solid rgba(79,142,247,.3); background:var(--acg); color:var(--ac); font-family:var(--mono); font-size:12px; letter-spacing:.5px; cursor:pointer; }
      .breathe-top:hover { border-color:var(--ac); }
      .breathe-mini { width:16px; height:16px; border-radius:50%; flex:none; background:radial-gradient(circle at 50% 40%, #d7e6ff, var(--ac)); animation:breathe-pulse 5.5s ease-in-out infinite; }
      @keyframes breathe-pulse { 0%,100% { transform:scale(.7); box-shadow:0 0 0 0 rgba(79,142,247,.5); } 50% { transform:scale(1.05); box-shadow:0 0 0 6px rgba(79,142,247,0); } }
      .breathe-overlay { position:fixed; inset:0; z-index:200; display:none; flex-direction:column; align-items:center; justify-content:center; gap:30px; background:rgba(8,10,14,.85); backdrop-filter:blur(7px); }
      .breathe-overlay.show { display:flex; }
      .breathe-close { position:absolute; top:18px; right:20px; width:38px; height:38px; border-radius:8px; border:.5px solid var(--bh); background:var(--card); color:var(--tx); font-size:15px; cursor:pointer; }
      .breathe-close:hover { border-color:var(--ac); color:var(--ac); }
      .breathe-stage { width:340px; height:340px; display:flex; align-items:center; justify-content:center; }
      .breathe-circle { width:150px; height:150px; border-radius:50%; display:flex; align-items:center; justify-content:center; transform:scale(1); transition:transform linear; will-change:transform; background:radial-gradient(circle at 50% 38%, rgba(79,142,247,.4), rgba(79,142,247,.08)); border:1px solid rgba(79,142,247,.55); box-shadow:0 0 70px rgba(79,142,247,.28); }
      .breathe-label { text-align:center; font-family:var(--mono); color:#eaf1ff; }
      .breathe-phase { display:block; font-size:15px; letter-spacing:.5px; }
      .breathe-count { display:block; font-size:26px; margin-top:4px; color:#fff; }
      .breathe-hint { font-family:var(--mono); font-size:11px; letter-spacing:.4px; color:var(--mu); text-align:center; max-width:340px; padding:0 20px; line-height:1.6; }
      .breathe-rounds { font-family:var(--mono); font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--ac); }
      .breathe-overlay.locked .breathe-close { display:none; }
      .breathe-fab { position:fixed; right:18px; bottom:18px; z-index:120; width:52px; height:52px; border-radius:50%; border:none; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at 50% 38%, var(--ac), #2c5fb0); box-shadow:0 4px 16px rgba(0,0,0,.4); animation:breathe-fab-pulse 5.5s ease-in-out infinite; }
      .breathe-fab::after { content:''; width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,.92); animation:breathe-dot 5.5s ease-in-out infinite; }
      .breathe-fab:hover { filter:brightness(1.08); }
      @keyframes breathe-fab-pulse { 0%,100% { box-shadow:0 4px 16px rgba(0,0,0,.4), 0 0 0 0 rgba(79,142,247,.5); } 50% { box-shadow:0 4px 16px rgba(0,0,0,.4), 0 0 0 12px rgba(79,142,247,0); } }
      @keyframes breathe-dot { 0%,100% { transform:scale(.7); } 50% { transform:scale(1.12); } }`;
    document.head.appendChild(s);
  },
  ensureDom() {
    if (document.getElementById('breathe-overlay')) return;
    const o = document.createElement('div');
    o.id = 'breathe-overlay'; o.className = 'breathe-overlay';
    o.innerHTML = `
      <button class="breathe-close" aria-label="Close">✕</button>
      <div class="breathe-stage"><div class="breathe-circle"><div class="breathe-label" id="breathe-label">Ready</div></div></div>
      <div class="breathe-hint">Diaphragmatic breathing — let your belly expand as you breathe in through the nose, and soften as you breathe out through the mouth.</div>
      <div class="breathe-rounds" id="breathe-rounds"></div>`;
    document.body.appendChild(o);
    o.querySelector('.breathe-close').addEventListener('click', () => this.stop());
    o.addEventListener('click', e => { if (e.target === o) this.stop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.running) this.stop(); });
  },
  open() {
    this.injectStyles(); this.ensureDom();
    this.rounds = 0; this.locked = true;
    const o = document.getElementById('breathe-overlay');
    o.classList.add('show', 'locked');
    this.updateRounds();
    this.running = true;
    this.phase(0);
  },
  updateRounds() {
    const el = document.getElementById('breathe-rounds');
    if (!el) return;
    el.textContent = this.locked ? `Round ${Math.min(this.rounds + 1, this.REQUIRED)} of ${this.REQUIRED}` : 'Close whenever you feel ready';
  },
  unlock() {
    this.locked = false;
    const o = document.getElementById('breathe-overlay');
    if (o) o.classList.remove('locked');
    this.updateRounds();
  },
  phase(i) {
    if (!this.running) return;
    const p = this.phases[i];
    const circle = document.querySelector('#breathe-overlay .breathe-circle');
    const label = document.getElementById('breathe-label');
    circle.style.transitionDuration = p.dur + 's';
    circle.style.transform = `scale(${p.scale})`;
    let remain = p.dur;
    const paint = () => label.innerHTML = `<span class="breathe-phase">${p.name}</span><span class="breathe-count">${remain}</span>`;
    paint();
    clearInterval(this.countdown);
    this.countdown = setInterval(() => { remain--; if (remain > 0) paint(); }, 1000);
    this.timer = setTimeout(() => {
      clearInterval(this.countdown);
      if (i === this.phases.length - 1) {
        this.rounds++;
        if (this.rounds >= this.REQUIRED && this.locked) this.unlock();
        this.updateRounds();
      }
      this.phase((i + 1) % this.phases.length);
    }, p.dur * 1000);
  },
  stop() {
    if (this.locked) return;
    this.running = false;
    clearTimeout(this.timer); clearInterval(this.countdown);
    const o = document.getElementById('breathe-overlay');
    if (o) { o.classList.remove('show'); const c = o.querySelector('.breathe-circle'); if (c) { c.style.transitionDuration = '.6s'; c.style.transform = 'scale(1)'; } }
  },
};
window.Breathe = Breathe;

window.Shell = Shell;
