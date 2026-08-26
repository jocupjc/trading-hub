// ─── Combined Daily Journal: Pre-market · OODA live · Post-market ─────────────
Shell.mount('pages/journal.html', '../');

const $ = (id) => document.getElementById(id);

// ── Pre / Post fields (saved as journal type 'daily') ────────────────────────
const JFIELDS = ['pre-trigger', 'pre-cgame', 'pre-goal', 'pre-risk', 'pre-mantra',
  'post-rules', 'post-score', 'post-best', 'post-worst', 'post-emotion', 'post-tomorrow'];
const CHECK_FIELDS = ['pre-chk-sleep', 'pre-chk-food', 'pre-chk-activity',
  'pre-w1', 'pre-w2', 'pre-w3', 'pre-w4', 'pre-w5', 'pre-w6', 'pre-w7', 'pre-w8'];

// ── Mental Game: button groups, 1–10 scale, contextual alerts ────────────────
function groupValue(id) { const b = $(id) && $(id).querySelector('.tog.active'); return b ? b.dataset.val : ''; }
function setGroupValue(id, val, onSel) {
  const g = $(id); if (!g) return; let active = null;
  g.querySelectorAll('.tog').forEach(b => { const on = !!val && b.dataset.val === val; b.classList.toggle('active', on); if (on) active = b; });
  onSel(active);
}
function scaleValue(id) { const b = $(id) && $(id).querySelector('.scale-btn.sel-green, .scale-btn.sel-amber, .scale-btn.sel-coral'); return b ? b.dataset.v : ''; }
function setScaleValue(id, val, onSel) {
  const s = $(id); if (!s) return;
  s.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
  if (val) { const b = s.querySelector(`.scale-btn[data-v="${val}"]`); if (b) { const v = +val; b.classList.add(v >= 8 ? 'sel-coral' : v >= 5 ? 'sel-amber' : 'sel-green'); onSel(v); return; } }
  onSel(null);
}

function emotionAlert(btn) {
  const el = $('alert-emotion'); if (!el) return; el.className = 'alert-box';
  if (!btn) return;
  const msgs = {
    neutral: { c: 'ok', m: '<strong>Neutraler Zustand.</strong> Optimal für objektives Trading. Halte diesen Zustand durch Selbstbeobachtung aktiv.' },
    conf: { c: 'ok', m: '<strong>Zuversicht erkannt.</strong> Produktiv — aber achte auf Winner\'s Tilt bei einer guten Streak. Bleib diszipliniert.' },
    fear: { c: 'warn', m: '<strong>Angst erkannt.</strong> Achte auf zu kleines Sizing und frühzeitiges Aussteigen bei intaktem Setup. Vertraue dem Prozess.' },
    tilt: { c: 'bad', m: '<strong>Tilt erkannt.</strong> Sei heute besonders wachsam. Überprüfe dein Tages-Limit doppelt und definiere deinen Abbruch-Punkt im Voraus.' },
    euphoria: { c: 'warn', m: '<strong>Euphorie / Winner-Tilt erkannt.</strong> Gefährlichster Zustand für Over-Sizing und Regelbrüche. Setze dich explizit an dein normales Sizing.' }
  };
  const m = msgs[btn.dataset.key]; if (m) { el.innerHTML = m.m; el.classList.add('show', m.c); }
}
function gameAlert(btn) {
  const el = $('alert-game'); if (!el) return; el.className = 'alert-box';
  if (!btn) return;
  const msgs = {
    A: { c: 'ok', m: '<strong>A-Game bereit.</strong> Normales Sizing. Voller Plan. Volle Konzentration.' },
    B: { c: 'warn', m: '<strong>B-Game.</strong> Sizing um 25–50% reduzieren. Engere Regeln. Fokus auf Prozess, nicht P&L.' },
    C: { c: 'bad', m: '<strong>C-Game erkannt.</strong> Erwäge, heute nicht zu handeln oder auf Paper-Trading zu wechseln. C-Game kostet langfristig mehr als es bringt.' }
  };
  const m = msgs[btn.dataset.key]; if (m) { el.innerHTML = m.m; el.classList.add('show', m.c); }
}
function intensityAlert(v) {
  const el = $('alert-intensity'); if (!el) return; el.className = 'alert-box';
  if (!v) return;
  if (v >= 8) { el.innerHTML = '<strong>Intensität ' + v + '/10</strong> — Erwäge, heute nicht zu handeln oder das Sizing auf 25% zu reduzieren. Hohes emotionales Arousal korreliert stark mit schlechteren Entscheidungen.'; el.classList.add('show', 'bad'); }
  else if (v >= 5) { el.innerHTML = '<strong>Mittlere Intensität ' + v + '/10</strong> — Bleibe wachsam. Sizing reduzieren, extra Pausen einplanen.'; el.classList.add('show', 'warn'); }
  else { el.innerHTML = '<strong>Niedrige Intensität ' + v + '/10</strong> — Gute Voraussetzungen für regelkonformes Trading.'; el.classList.add('show', 'ok'); }
}

function readJournal() {
  const o = {};
  JFIELDS.forEach(f => { const el = $(f); o[f] = el ? el.value : ''; });
  CHECK_FIELDS.forEach(f => { const el = $(f); o[f] = el ? el.checked : false; });
  o['pre-emotion'] = groupValue('grp-emotion');
  o['pre-game'] = groupValue('grp-game');
  o['pre-intensity'] = scaleValue('scale-intensity');
  document.querySelectorAll('[data-prep]').forEach(i => o[i.dataset.prep] = i.dataset.state || '');
  RF_KEYS.forEach(k => o['rf-' + k] = rfOn(k));
  o['rf-news-tags'] = rfNewsTags.slice();
  BOX_SETS.forEach(s => {
    BOX_KEYS.forEach(k => o[s.attr + '-' + k] = boxStateOf(s.attr, k));
    BOX_MODEL_KEYS.forEach(k => { const el = document.querySelector(`[data-${s.attr}-model="${k}"]`); o[s.attr + '-model-' + k] = el ? el.value : ''; });
  });
  return o;
}
function fillJournal(p) {
  JFIELDS.forEach(f => { const el = $(f); if (el) el.value = (p && p[f]) || ''; });
  CHECK_FIELDS.forEach(f => {
    const el = $(f);
    if (el) { el.checked = !!(p && p[f]); const row = el.closest('.chk-row'); if (row) row.classList.toggle('on', el.checked); }
  });
  setGroupValue('grp-emotion', (p && p['pre-emotion']) || '', emotionAlert);
  setGroupValue('grp-game', (p && p['pre-game']) || '', gameAlert);
  setScaleValue('scale-intensity', (p && p['pre-intensity']) || '', intensityAlert);
  document.querySelectorAll('[data-prep]').forEach(i => setPrepState(i, (p && p[i.dataset.prep]) || ''));
  updatePrepSummary();
  RF_KEYS.forEach(k => setRf(k, p && p['rf-' + k]));
  rfNewsTags = (p && Array.isArray(p['rf-news-tags'])) ? p['rf-news-tags'].slice() : [];
  renderNewsTags();
  updateRfBadges();
  BOX_SETS.forEach(s => {
    BOX_KEYS.forEach(k => { const el = boxItem(s.attr, k); if (el) setBoxState(el, (p && p[s.attr + '-' + k]) || ''); });
    BOX_MODEL_KEYS.forEach(k => { const el = document.querySelector(`[data-${s.attr}-model="${k}"]`); if (el) el.value = (p && p[s.attr + '-model-' + k]) || ''; });
    updateBoxSummary(s.attr, s.summary);
  });
}

// Ronin-style directional items (Pre-trade prep)
function setPrepState(item, state) {
  item.dataset.state = state || '';
  item.classList.remove('U', 'D', 'N');
  const badge = item.querySelector('.cl-badge');
  if (state) { item.classList.add(state === 'U' ? 'U' : state === 'D' ? 'D' : 'N'); if (badge) badge.textContent = state; }
  else if (badge) badge.textContent = '·';
}
function updatePrepSummary() {
  const items = [...document.querySelectorAll('[data-prep]')];
  const u = items.filter(i => i.dataset.state === 'U').length;
  const d = items.filter(i => i.dataset.state === 'D').length;
  const n = items.filter(i => i.dataset.state && i.dataset.state !== 'U' && i.dataset.state !== 'D').length;
  const el = $('prep-summary'); if (!el) return;
  if (!u && !d && !n) { el.innerHTML = ''; return; }
  const bias = (u > 0 || d > 0) && u !== d ? (u > d ? 'U' : 'D') : null;
  const biasBadge = bias ? `<span class="cl-bias cl-bias-${bias}">${bias === 'U' ? '▲ UP' : '▼ DOWN'}</span>` : '';
  el.innerHTML = `${biasBadge}${u ? `<span class="cl-u-count">${u}U</span>` : ''}${d ? `<span class="cl-d-count">${d}D</span>` : ''}${n ? `<span class="cl-n-count">${n}N</span>` : ''}`;
}

// ── Red Flags — ported 1:1 from Ronin Sequence ───────────────────────────────
const RF_KEYS = ['rcModel', 'rxModel', 'news', 'insideWdr', 'weeklyRcModel', 'wdrrbFalseDay',
  'adrHalfDisagree', 'tripleFalseOdr', 'yesterdayInsideDay', 'wdrrbQ37', 'turnaroundThursday',
  'noWdrrbBreakout', 'brokenAdr', 'adrCombDdrMin', 'adrSpanningWdrrbMid', 'multiFalseDay'];
const RF_YELLOW = new Set(['news', 'insideWdr', 'weeklyRcModel', 'wdrrbFalseDay', 'adrHalfDisagree', 'tripleFalseOdr']);
const RF_MODEL = ['rcModel', 'rxModel'];
const RF_OUTSIDE = ['yesterdayInsideDay'];
const RF_REVERSAL = ['wdrrbQ37', 'turnaroundThursday'];
const RF_SPECIAL = new Set([...RF_MODEL, ...RF_OUTSIDE, ...RF_REVERSAL]);
let rfNewsTags = [];

function rfItem(key) { return document.querySelector(`.rf-item[data-rf="${key}"]`); }
function rfOn(key) { const el = rfItem(key); return !!(el && el.classList.contains('on')); }
function setRf(key, on) { const el = rfItem(key); if (el) el.classList.toggle('on', !!on); }

function renderNewsTags() {
  const wrap = $('rf-news-tags'); if (!wrap) return;
  const input = $('rf-news-tag-input');
  wrap.querySelectorAll('.rf-tag').forEach(t => t.remove());
  rfNewsTags.forEach(t => {
    const chip = document.createElement('span'); chip.className = 'rf-tag';
    chip.innerHTML = `${esc(t)}<span class="x" data-rmtag="${esc(t)}">×</span>`;
    wrap.insertBefore(chip, input);
  });
}
function updateRfBadges() {
  const el = $('rf-badges'); if (!el) return;
  const rc = rfOn('rcModel'), rx = rfOn('rxModel');
  let model = '';
  if (rc && rx) model = '<span class="rf-badge rf-badge-yellow">CAUTION</span>';
  else if (rc) model = '<span class="rf-badge rf-badge-green">🟢 GREEN LIGHT</span>';
  else if (rx) model = '<span class="rf-badge rf-badge-red">🔴 RED LIGHT</span>';
  const outside = RF_OUTSIDE.some(rfOn);
  const reversal = RF_REVERSAL.some(rfOn);
  const cautionCount = RF_KEYS.filter(k => !RF_SPECIAL.has(k) && RF_YELLOW.has(k) && rfOn(k)).length;
  const ampCount = RF_KEYS.filter(k => !RF_SPECIAL.has(k) && !RF_YELLOW.has(k) && rfOn(k)).length;
  el.innerHTML = model
    + (outside ? '<span class="rf-badge rf-badge-info">↔ OUTSIDE DAY PROBABLE</span>' : '')
    + (reversal ? '<span class="rf-badge rf-badge-orange">↻ REVERSAL LIKELY</span>' : '')
    + (cautionCount ? `<span class="rf-count rf-count-yellow">${cautionCount} caution</span>` : '')
    + (ampCount ? `<span class="rf-count rf-count-gray">${ampCount} amplifier${ampCount > 1 ? 's' : ''}</span>` : '');
}

// ── Box Formation checklists — ported 1:1 from Ronin Sequence ─────────────────
const BOX_CYCLE = ['marketState', 'monthly', 'weekly', 'daily', 'rdr', 'dailyModel', 'partials', 'ddrComSym', 'ddrSepMinMin', 'gaps', 'ass', 'vwap', 'svpHtf'];
const BOX_CHECK = ['markTime', 'svpLtf', 'vibsH1m30', 'confluencesCheck', 'rdrModel', 'markMakeOrBreak', 'checkDdr', 'markTargets', 'transitionHL', 'wdrrbOpen', 'chaining'];
const BOX_KEYS = [...BOX_CYCLE, ...BOX_CHECK];
const BOX_MODEL_KEYS = ['weekly', 'dailyModel', 'rdrModel'];
// two independent checklist instances: 0930–1030 (box) and 0230–0400 (box2)
const BOX_SETS = [{ attr: 'box', summary: 'box-summary' }, { attr: 'box2', summary: 'box2-summary' }];

function boxItem(attr, key) { return document.querySelector(`.cl-item[data-${attr}="${key}"]`); }
function boxStateOf(attr, key) { const el = boxItem(attr, key); return el ? (el.dataset.state || '') : ''; }
function setBoxState(item, state) {
  item.dataset.state = state || '';
  item.classList.remove('U', 'D', 'N', 'CHK', 'CHKY');
  const badge = item.querySelector('.cl-badge');
  const checkonly = item.dataset.checkonly === '1';
  if (checkonly) {
    if (state === 'X') { item.classList.add(item.dataset.yellow === '1' ? 'CHKY' : 'CHK'); if (badge) badge.textContent = '✓'; }
    else if (badge) badge.textContent = '·';
  } else {
    if (state) { item.classList.add(state); if (badge) badge.textContent = state; }
    else if (badge) badge.textContent = '·';
  }
}
function updateBoxSummary(attr, summaryId) {
  const el = $(summaryId); if (!el) return;
  const u = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'U').length;
  const d = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'D').length;
  const n = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'N').length;
  const checked = BOX_CHECK.filter(k => boxStateOf(attr, k) === 'X').length;
  if (!u && !d && !n && !checked) { el.innerHTML = ''; return; }
  const winner = (u > 0 || d > 0) && u !== d ? (u > d ? 'U' : 'D') : null;
  const biasBadge = winner ? `<span class="cl-bias cl-bias-${winner}">${winner === 'U' ? '▲ UP BIAS' : '▼ DOWN BIAS'}</span>` : '';
  el.innerHTML = biasBadge
    + (u ? `<span class="cl-u-count${winner === 'U' ? ' cl-winning' : ''}">${u}U</span>` : '')
    + (d ? `<span class="cl-d-count${winner === 'D' ? ' cl-winning' : ''}">${d}D</span>` : '')
    + (n ? `<span class="cl-n-count">${n}N</span>` : '')
    + (checked ? `<span class="cl-chk-count">${checked}✓</span>` : '');
}


// ── OODA config (saved as journal type 'ooda') ───────────────────────────────
const ALGO = ['', 'ASS DOWN', 'ASS UP', 'MCR', 'Ranging'];
const ACTIONS = ['WAIT', 'HUNT', 'ENTER', 'TRAIL', 'STOP'];
const BODY = ['', 'Regulated', 'Energized', 'Anxious', 'Euphoric', 'Stressed'];
const MIND = ['', 'Focused', 'Neutral', 'Scattered'];
const OODA_WINDOW = '08:30-17:30';
let ROWS = [];

$('j-date').value = todayStr();

function buildRows(windowStr) {
  const [start, end] = windowStr.split('-');
  const toMin = (t) => (+t.slice(0, 2)) * 60 + (+t.slice(3, 5));
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const rows = [];
  for (let m = toMin(start), i = 0; m < toMin(end); m += 5, i++) {
    rows.push({ i, time: fmt(m), end: fmt(m + 5), hourStart: m % 60 === 0 && i > 0 });
  }
  return rows;
}

function opt(list, val) { return list.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join(''); }

function renderTable(data) {
  ROWS = buildRows(OODA_WINDOW);
  const byIdx = {}; (data.rows || []).forEach(r => byIdx[r.i] = r);
  $('obody').innerHTML = ROWS.map(r => {
    const d = byIdx[r.i] || {};
    const sep = r.hourStart ? '<tr class="hoursep"><td colspan="7"></td></tr>' : '';
    return `${sep}<tr data-i="${r.i}" data-time="${r.time}">
      <td class="col-t"><span class="tl">${r.time}–${r.end}</span></td>
      <td><textarea data-f="obs" data-i="${r.i}" placeholder="Observe…">${esc(d.obs || '')}</textarea></td>
      <td><textarea data-f="ori" data-i="${r.i}" placeholder="Orient…">${esc(d.ori || '')}</textarea></td>
      <td class="col-a"><select data-f="algo" data-i="${r.i}">${opt(ALGO, d.algo || '')}</select></td>
      <td class="col-act"><div class="ag">${ACTIONS.map(a =>
        `<button class="ab ${(d.acts || []).includes(a) ? 'on-' + a : ''}" data-act="${a}" data-i="${r.i}">${a}</button>`).join('')}</div></td>
      <td class="col-b"><select data-f="body" data-i="${r.i}">${opt(BODY, d.body || '')}</select></td>
      <td class="col-m"><select data-f="mind" data-i="${r.i}">${opt(MIND, d.mind || '')}</select></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#obody textarea[data-f]').forEach(t => { autoGrow(t); t.addEventListener('input', () => autoGrow(t)); });
  document.querySelectorAll('#obody .ab[data-act]').forEach(b => b.onclick = () => {
    const wasOn = b.classList.contains('on-' + b.dataset.act);
    document.querySelectorAll(`#obody .ab[data-i="${b.dataset.i}"]`).forEach(x => x.className = 'ab');
    if (!wasOn) b.classList.add('on-' + b.dataset.act);
  });
  highlightNow();
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

function collectOoda() {
  const rows = [];
  document.querySelectorAll('#obody tr[data-i]').forEach(tr => {
    const i = +tr.dataset.i;
    const g = (f) => tr.querySelector(`[data-f="${f}"]`)?.value || '';
    const acts = [...tr.querySelectorAll('.ab')].filter(b => b.classList.contains('on-' + b.dataset.act)).map(b => b.dataset.act);
    const obs = g('obs'), ori = g('ori'), algo = g('algo'), body = g('body'), mind = g('mind');
    if (obs || ori || algo || body || mind || acts.length) rows.push({ i, obs, ori, algo, body, mind, acts });
  });
  return { rows };
}

function highlightNow() {
  const now = new Date();
  const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  document.querySelectorAll('#obody tr[data-time]').forEach(tr => {
    const t = tr.dataset.time; const next = tr.nextElementSibling?.dataset?.time;
    tr.classList.toggle('now', hm >= t && (!next || hm < next));
  });
}

// ── Auto-save: instant local drafts + debounced cloud push ───────────────────
let loadedDate = null;
let autoTimer = null;
const draftKey = (type, date) => `th:draft:${type}:${date}`;
function setStatus(t) { const el = $('save-status'); if (el) el.textContent = t; }
function writeDrafts(date) {
  if (!date) return;
  try {
    localStorage.setItem(draftKey('daily', date), JSON.stringify(readJournal()));
    localStorage.setItem(draftKey('ooda', date), JSON.stringify(collectOoda()));
  } catch (e) {}
}
function clearDrafts(date) {
  try { localStorage.removeItem(draftKey('daily', date)); localStorage.removeItem(draftKey('ooda', date)); } catch (e) {}
}

// ── Load / save the whole day (pre+post as 'daily', OODA as 'ooda') ──────────
async function load(date) {
  let dj = null, oj = null;
  try { dj = await DB.getJournal(date, 'daily'); } catch (e) { console.error(e); }
  try { oj = await DB.getJournal(date, 'ooda'); } catch (e) { console.error(e); }
  // Overlay any local unsaved draft so edits survive reloads / navigation
  try {
    const dd = JSON.parse(localStorage.getItem(draftKey('daily', date)) || 'null'); if (dd) dj = dd;
    const od = JSON.parse(localStorage.getItem(draftKey('ooda', date)) || 'null'); if (od) oj = od;
  } catch (e) {}
  fillJournal(dj || {});
  oj = oj || {};
  renderTable(oj);
  loadedDate = date;
  setStatus('');
}

async function persistDate(date, silent) {
  if (!date) { if (!silent) Shell.toast('Pick a date'); return; }
  writeDrafts(date);
  try {
    await DB.saveJournal(date, 'daily', readJournal());
    await DB.saveJournal(date, 'ooda', collectOoda());
    clearDrafts(date);
    if (silent) setStatus('saved ✓'); else { Shell.toast('Saved ' + date); await renderArchive(); }
  } catch (e) { console.error(e); if (silent) setStatus('draft saved'); else Shell.toast('Save failed'); }
}
function saveDay() { return persistDate($('j-date').value, false); }

function scheduleAutosave() {
  const date = $('j-date').value;
  if (date) writeDrafts(date);      // instant, synchronous safety net
  setStatus('saving…');
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => persistDate($('j-date').value, true), 500);
}

async function renderArchive() {
  let list; try { list = await DB.listJournal('daily'); } catch { list = []; }
  const oodaDates = new Set((await DB.listJournal('ooda').catch(() => [])).map(e => e.date));
  $('archive').innerHTML = list.length
    ? `<table class="data"><thead><tr><th>Date</th><th>OODA</th><th>Updated</th><th></th></tr></thead><tbody>${list.map(e => `
        <tr><td class="mono">${e.date}</td>
        <td class="mono">${oodaDates.has(e.date) ? '✓' : '—'}</td>
        <td class="mono" style="color:var(--mu)">${(e.updated_at || '').slice(0, 16).replace('T', ' ')}</td>
        <td><button class="btn sm" data-load="${e.date}">open</button></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No days saved yet.</div>';
  document.querySelectorAll('[data-load]').forEach(b => b.onclick = async () => {
    if (loadedDate && loadedDate !== b.dataset.load) await persistDate(loadedDate, true);
    $('j-date').value = b.dataset.load; load(b.dataset.load); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

$('btnSave').onclick = saveDay;
$('j-date').addEventListener('change', async () => {
  clearTimeout(autoTimer);
  if (loadedDate && loadedDate !== $('j-date').value) await persistDate(loadedDate, true);
  load($('j-date').value);
});

// Auto-save on any edit: instant local draft + debounced cloud push
const mainEl = document.querySelector('main');
mainEl.addEventListener('input', e => { if (e.target.id !== 'j-date') scheduleAutosave(); });
mainEl.addEventListener('change', e => { if (e.target.id !== 'j-date') scheduleAutosave(); });
mainEl.addEventListener('click', e => { if (e.target.closest('.tog, .scale-btn, .ab, .cl-item, .rf-item')) scheduleAutosave(); });
window.addEventListener('pagehide', () => { const d = $('j-date').value; if (d) writeDrafts(d); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistDate($('j-date').value, true); });
document.querySelectorAll('.sec-head').forEach(h =>
  h.addEventListener('click', () => h.closest('.jsection').classList.toggle('collapsed')));
document.querySelectorAll('.chk-row input[type=checkbox]').forEach(cb =>
  cb.addEventListener('change', () => cb.closest('.chk-row').classList.toggle('on', cb.checked)));

// Single-select toggle button groups (emotion, game) with contextual alerts
[['grp-emotion', emotionAlert], ['grp-game', gameAlert]].forEach(([gid, alertFn]) => {
  const g = $(gid); if (!g) return;
  g.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => {
    const was = b.classList.contains('active');
    g.querySelectorAll('.tog').forEach(x => x.classList.remove('active'));
    if (!was) b.classList.add('active');
    alertFn(b.classList.contains('active') ? b : null);
  }));
});
// Intensity 1–10 scale (click again on the selected number to reset)
const _si = $('scale-intensity');
if (_si) _si.querySelectorAll('.scale-btn').forEach(b => b.addEventListener('click', () => {
  const wasSel = b.classList.contains('sel-green') || b.classList.contains('sel-amber') || b.classList.contains('sel-coral');
  _si.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
  if (wasSel) { intensityAlert(0); return; }
  const v = +b.dataset.v; b.classList.add(v >= 8 ? 'sel-coral' : v >= 5 ? 'sel-amber' : 'sel-green');
  intensityAlert(v);
}));

// Ronin directional items — click to cycle U → D → third → empty
document.querySelectorAll('[data-prep]').forEach(item => item.addEventListener('click', () => {
  const third = item.dataset.third || 'N';
  const cur = item.dataset.state || '';
  const next = cur === '' ? 'U' : cur === 'U' ? 'D' : cur === 'D' ? third : '';
  setPrepState(item, next);
  updatePrepSummary();
}));

// Red Flags — click to toggle; badges reflect Ronin's caution/amplifier/signal logic
document.querySelectorAll('.rf-item[data-rf]').forEach(item => item.addEventListener('click', () => {
  item.classList.toggle('on');
  updateRfBadges();
}));
const _newsInput = $('rf-news-tag-input');
if (_newsInput) _newsInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const v = _newsInput.value.trim();
  if (v && !rfNewsTags.includes(v)) { rfNewsTags.push(v); _newsInput.value = ''; renderNewsTags(); scheduleAutosave(); }
});
const _newsWrap = $('rf-news-tags');
if (_newsWrap) _newsWrap.addEventListener('click', e => {
  const x = e.target.closest('[data-rmtag]');
  if (!x) return;
  const t = x.getAttribute('data-rmtag');
  rfNewsTags = rfNewsTags.filter(z => z !== t);
  renderNewsTags(); scheduleAutosave();
});

// Box Formation checklists — click to cycle (U→D→N→empty) or toggle checks (✓)
BOX_SETS.forEach(s => document.querySelectorAll(`.cl-item[data-${s.attr}]`).forEach(item => item.addEventListener('click', () => {
  const cur = item.dataset.state || '';
  const checkonly = item.dataset.checkonly === '1';
  const next = checkonly ? (cur === 'X' ? '' : 'X') : (cur === '' ? 'U' : cur === 'U' ? 'D' : cur === 'D' ? 'N' : '');
  setBoxState(item, next);
  updateBoxSummary(s.attr, s.summary);
})));

setInterval(highlightNow, 60000);
Auth.ready.then(() => { load(todayStr()); renderArchive(); });
