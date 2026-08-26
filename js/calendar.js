// ─────────────────────────────────────────────────────────────────────────────
// DDR / WDDRS calendars — monthly weekday grids with click-cycle day states.
// One journal_entries row per year (date = `${year}-01-01`, type = cal:<type>:<inst>),
// payload = { 'YYYY-MM-DD': state } where state ∈ target|stop|contained|nodata.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const params = new URLSearchParams(location.search);
  const TYPES = {
    ddr: { label: 'DDR', name: 'Daily Defining Range', tag: 'DDR' },
    wddrs: { label: 'WDDRS', name: 'Weekly / Daily Defining Range Sequence', tag: 'WDDRS' },
  };
  const INSTR = { NQ: 1, ES: 1, CL: 1 };
  const type = TYPES[params.get('type')] ? params.get('type') : 'ddr';
  const inst = INSTR[params.get('inst')] ? params.get('inst') : 'NQ';
  const T = TYPES[type];
  const STORE_TYPE = `cal:${type}:${inst}`;

  const STATES = ['', 'target', 'stop', 'contained', 'nodata'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  let year = parseInt(localStorage.getItem('th:cal-year'), 10) || new Date().getFullYear();
  let data = {};
  let saveTimer = null;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const setStatus = (s) => { const el = $('cal-status'); if (el) el.textContent = s; };

  async function load() {
    setStatus('loading…');
    try { data = (await DB.getJournal(`${year}-01-01`, STORE_TYPE)) || {}; }
    catch (e) { console.error(e); data = {}; }
    setStatus('');
    render();
  }

  function scheduleSave() {
    setStatus('saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await DB.saveJournal(`${year}-01-01`, STORE_TYPE, data); setStatus('saved ✓'); }
      catch (e) { console.error(e); setStatus('save failed'); }
    }, 500);
  }

  function summary(y, m) {
    let t = 0, s = 0, c = 0;
    const dim = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const st = data[key(y, m, d)];
      if (st === 'target') t++; else if (st === 'stop') s++; else if (st === 'contained') c++;
    }
    const total = t + s + c;
    const p = (n) => (total ? (n / total * 100).toFixed(1) : '0.0');
    return `${T.tag}: Target Reached First=${t} (${p(t)}%), Stop Breached First=${s} (${p(s)}%), Contained=${c} (${p(c)}%) (Total=${total})`;
  }

  function renderMonth(y, m) {
    const dim = new Date(y, m + 1, 0).getDate();
    const weeks = []; let week = [null, null, null, null, null];
    for (let d = 1; d <= dim; d++) {
      const dow = (new Date(y, m, d).getDay() + 6) % 7; // Mon=0 … Sun=6
      if (dow > 4) continue;
      week[dow] = d;
      if (dow === 4) { weeks.push(week); week = [null, null, null, null, null]; }
    }
    if (week.some((x) => x !== null)) weeks.push(week);

    const head = WD.map((w) => `<div class="cal-wd">${w}</div>`).join('');
    const body = weeks.map((wk) => wk.map((d) => {
      if (d === null) return '<div class="cal-empty"></div>';
      const st = data[key(y, m, d)] || '';
      return `<button class="cal-day${st ? ' state-' + st : ''}" data-date="${key(y, m, d)}">${d}</button>`;
    }).join('')).join('');

    return `<div class="cal-month" data-month="${m}">
      <button class="cal-month-head" data-monthtoggle="${m}"><span>${MONTHS[m]} ${y}</span><span class="cal-chev">▾</span></button>
      <div class="cal-month-body">
        <div class="cal-grid">${head}${body}</div>
        <div class="cal-summary" data-m="${m}">${summary(y, m)}</div>
      </div>
    </div>`;
  }

  function render() {
    $('cal-year').textContent = year;
    $('cal-root').innerHTML = MONTHS.map((_, m) => renderMonth(year, m)).join('');
  }

  function onClick(e) {
    const head = e.target.closest('.cal-month-head');
    if (head) { head.closest('.cal-month').classList.toggle('collapsed'); return; }
    const btn = e.target.closest('.cal-day');
    if (!btn) return;
    const date = btn.dataset.date;
    const next = STATES[(STATES.indexOf(data[date] || '') + 1) % STATES.length];
    if (next) data[date] = next; else delete data[date];
    btn.className = 'cal-day' + (next ? ' state-' + next : '');
    const m = parseInt(date.slice(5, 7), 10) - 1;
    const sm = document.querySelector(`.cal-summary[data-m="${m}"]`);
    if (sm) sm.textContent = summary(year, m);
    scheduleSave();
  }

  function setYear(y) {
    clearTimeout(saveTimer);
    year = y; localStorage.setItem('th:cal-year', String(y));
    load();
  }

  function init() {
    Shell.mount(`pages/calendar.html?type=${type}&inst=${inst}`, '../');
    const heading = `${T.label} Calendar · ${inst}`;
    $('title').textContent = heading;
    $('subtitle').textContent = `${T.name} — ${inst}`;
    document.title = heading + ' · Trading Hub';
    $('cal-prev').addEventListener('click', () => setYear(year - 1));
    $('cal-next').addEventListener('click', () => setYear(year + 1));
    $('cal-expand').addEventListener('click', () => document.querySelectorAll('.cal-month').forEach((el) => el.classList.remove('collapsed')));
    $('cal-collapse').addEventListener('click', () => document.querySelectorAll('.cal-month').forEach((el) => el.classList.add('collapsed')));
    $('cal-root').addEventListener('click', onClick);
    (window.Auth && Auth.ready ? Auth.ready : Promise.resolve()).then(load);
  }

  init();
})();
