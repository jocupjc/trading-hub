// ─── Combined Daily Journal: Pre-market · OODA live · Post-market ─────────────
Shell.mount('pages/journal.html', '../');

const $ = (id) => document.getElementById(id);

// ── Pre / Post fields (saved as journal type 'daily') ────────────────────────
const JFIELDS = ['pre-trigger', 'pre-cgame', 'pre-goal', 'pre-risk', 'pre-mantra', 'prep-adr-midline',
  'prep-wk-high', 'prep-wk-low', 'prep-wk-cycle',
  'txt-emotion-moment', 'txt-best-trade', 'txt-worst-trade', 'txt-eine-sache', 'txt-max-loss', 'txt-tagesziel',
  'txt-emo-trigger', 'txt-irr-belief', 'txt-reframe', 'txt-learning', 'txt-tmrw'];
// Post-market reflection single-select groups (multi-select: grp-rd-emotion)
const POST_GROUPS = ['grp-maxloss', 'grp-losses', 'grp-stopp', 'grp-gefuehl', 'grp-regelkonform', 'grp-rache',
  'grp-mental', 'grp-setup-qual', 'grp-sl', 'grp-geduld', 'grp-vorbereitung', 'grp-commitment'];
const CHECK_FIELDS = ['pre-chk-sleep', 'pre-chk-food', 'pre-chk-activity',
  'pre-w1', 'pre-w3', 'pre-w5', 'pre-w6', 'pre-w8',
  'pm-db1', 'pm-db2', 'pm-db3', 'pm-db4',
  'pm-cl1', 'pm-cl2', 'pm-cl3', 'pm-cl4'];

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
// Performance self score — higher is better (inverted colours vs intensity)
function setPerfScale(id, val) {
  const s = $(id); if (!s) return;
  s.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
  if (val) { const b = s.querySelector(`.scale-btn[data-v="${val}"]`); if (b) { const v = +val; b.classList.add(v >= 8 ? 'sel-green' : v >= 5 ? 'sel-amber' : 'sel-coral'); } }
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
function postEmotionAlert(btn) {
  const el = $('alert-post-emotion'); if (!el) return; el.className = 'alert-box';
  if (!btn) return;
  const msgs = {
    tilt: { c: 'bad', m: '<strong>Tilt-Nachbearbeitung:</strong> Welche Erwartung wurde verletzt? Welche implizite Regel hattest du im Kopf, die der Markt gebrochen hat? Diese Erwartung ist das Problem, nicht der Trade.' },
    fear: { c: 'warn', m: '<strong>Angst-Nachbearbeitung:</strong> Was ist das schlimmste reale Szenario? Ist es wirklich so katastrophal wie es sich anfühlt? Meist überschätzen wir Konsequenzen massiv.' },
    greed: { c: 'warn', m: '<strong>FOMO-Nachbearbeitung:</strong> Hätte der verpasste Trade deinem Setup entsprochen? Wenn ja: Notiere die Regel. Wenn nein: Es war kein deiner Trades.' },
    euphoria: { c: 'warn', m: '<strong>Winner-Tilt Nachbearbeitung:</strong> Zähle alle Regelbrüche heute. Waren die Gewinne Können oder Glück? Kalibriere ehrlich neu.' },
    conf: { c: 'ok', m: '<strong>Selbstvertrauen stärken:</strong> Notiere, was heute gut lief und warum. Das Gehirn neigt dazu, Erfolge zu vergessen und Fehler zu speichern — aktiv gegensteuern.' }
  };
  const m = msgs[btn.dataset.key]; if (m) { el.innerHTML = m.m; el.classList.add('show', m.c); }
}
function multiGroupValue(id) { const g = $(id); return g ? [...g.querySelectorAll('.tog.active')].map(b => b.dataset.val) : []; }
function setMultiGroup(id, vals) { const g = $(id); if (!g) return; const set = new Set(vals || []); g.querySelectorAll('.tog').forEach(b => b.classList.toggle('active', set.has(b.dataset.val))); }
// Post-market insights — ported 1:1 from the Daily Reflection tool
function postInsights() {
  const out = [];
  const losses = groupValue('grp-losses');
  const stopp = groupValue('grp-stopp');
  const rache = groupValue('grp-rache');
  const emotion = multiGroupValue('grp-rd-emotion');
  const sl = groupValue('grp-sl');
  const setupQual = groupValue('grp-setup-qual');
  const commitment = groupValue('grp-commitment');
  const eineSache = ($('txt-eine-sache') || {}).value || '';
  if (losses === '4+') out.push({ type: 'bad', text: 'Du hast das 3-Trade-Limit übertreten. Das ist das kritischste Signal des Tages — analysiere genau, was dich dazu gebracht hat.' });
  else if (losses === '3' && stopp === 'yes-immediately') out.push({ type: 'good', text: 'Limit erreicht, sofort gestoppt — das ist Disziplin. Genau so funktioniert das System.' });
  else if (losses === '3' && stopp === 'no') out.push({ type: 'bad', text: 'Handelsstopp ignoriert. Der teuerste Moment im Trading beginnt genau hier — emotionales Weitertraden nach dem Limit.' });
  if (rache === 'yes') out.push({ type: 'bad', text: 'Rache-Trade ausgeführt: häufigstes Muster hinter großen Verlusttagen. Was hat den Impuls ausgelöst?' });
  else if (rache === 'impulse-resisted') out.push({ type: 'good', text: 'Rache-Impuls erkannt und widerstanden — das ist mentale Stärke. Diese Fähigkeit schützt dein Konto.' });
  if (emotion.includes('fomo') || emotion.includes('greed')) out.push({ type: 'warn', text: 'FOMO / Gier ist ein Signal, kein Handelsgrund. Morgen: Warte auf das Setup, nicht auf das Gefühl.' });
  if (sl === 'ignored') out.push({ type: 'bad', text: 'Stop-Loss nicht gesetzt oder ignoriert. Das ist die teuerste Gewohnheit im Trading — keine Ausnahmen, nie.' });
  else if (sl === 'moved-once') out.push({ type: 'warn', text: 'Stop-Loss nachgezogen oder bewegt. Jede Ausnahme trainiert das Gehirn, Regeln als optional zu sehen.' });
  if (setupQual === 'impulsive') out.push({ type: 'warn', text: 'Impulsive Entries entstehen aus Langeweile oder dem Druck, dabei sein zu müssen. Kein Setup = kein Trade.' });
  if (commitment === '100') out.push({ type: 'good', text: 'Starkes Commitment für morgen. Schreibe deine eine Verbesserung sichtbar auf — Post-it am Monitor.' });
  if (eineSache && eineSache.trim().length > 10) out.push({ type: 'info', text: 'Vorsatz: "' + eineSache.trim().substring(0, 90) + (eineSache.length > 90 ? '...' : '') + '"' });
  if (out.length === 0) out.push({ type: 'info', text: 'Reflexion abgeschlossen. Regelmäßiges Journaling ist einer der stärksten Hebel für Trading-Disziplin.' });
  return out;
}
function renderPostInsights() {
  const el = $('post-insights'); if (!el) return;
  el.innerHTML = postInsights().map(i => `<div class="insight ${i.type}">${esc(i.text)}</div>`).join('');
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
  o['grp-post-emotion'] = groupValue('grp-post-emotion');
  o['pre-intensity'] = scaleValue('scale-intensity');
  POST_GROUPS.forEach(g => o[g] = groupValue(g));
  o['grp-rd-emotion'] = multiGroupValue('grp-rd-emotion');
  o['post-perf'] = scaleValue('scale-perf');
  o['scale-process'] = scaleValue('scale-process');
  o['scale-emoctrl'] = scaleValue('scale-emoctrl');
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
  setGroupValue('grp-post-emotion', (p && p['grp-post-emotion']) || '', postEmotionAlert);
  setScaleValue('scale-intensity', (p && p['pre-intensity']) || '', intensityAlert);
  POST_GROUPS.forEach(g => setGroupValue(g, (p && p[g]) || '', () => {}));
  setMultiGroup('grp-rd-emotion', (p && p['grp-rd-emotion']) || []);
  setPerfScale('scale-perf', (p && p['post-perf']) || '');
  setPerfScale('scale-process', (p && p['scale-process']) || '');
  setPerfScale('scale-emoctrl', (p && p['scale-emoctrl']) || '');
  renderPostInsights();
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
  updateDebrief();
  updateClose();
}

// Trade debrief progress bar (Post-market — Daily result)
function updateDebrief() {
  const ids = ['pm-db1', 'pm-db2', 'pm-db3', 'pm-db4'];
  const done = ids.filter(id => { const el = $(id); return el && el.checked; }).length;
  const fill = $('pb-debrief'); if (fill) fill.style.width = (done / ids.length * 100) + '%';
  const ctr = $('debrief-counter'); if (ctr) ctr.textContent = done + '/' + ids.length;
}
// Abschlussritual progress bar (Post-market — Intentions for tomorrow)
function updateClose() {
  const ids = ['pm-cl1', 'pm-cl2', 'pm-cl3', 'pm-cl4'];
  const done = ids.filter(id => { const el = $(id); return el && el.checked; }).length;
  const fill = $('pb-close'); if (fill) fill.style.width = (done / ids.length * 100) + '%';
  const ctr = $('close-counter'); if (ctr) ctr.textContent = done + '/' + ids.length;
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
  const el = $(summaryId); const el2 = $(summaryId + '-ooda');
  if (!el && !el2) return;
  const u = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'U').length;
  const d = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'D').length;
  const n = BOX_CYCLE.filter(k => boxStateOf(attr, k) === 'N').length;
  const checked = BOX_CHECK.filter(k => boxStateOf(attr, k) === 'X').length;
  let html = '';
  if (u || d || n || checked) {
    const winner = (u > 0 || d > 0) && u !== d ? (u > d ? 'U' : 'D') : null;
    const biasBadge = winner ? `<span class="cl-bias cl-bias-${winner}">${winner === 'U' ? '▲ UP BIAS' : '▼ DOWN BIAS'}</span>` : '';
    html = biasBadge
      + (u ? `<span class="cl-u-count${winner === 'U' ? ' cl-winning' : ''}">${u}U</span>` : '')
      + (d ? `<span class="cl-d-count${winner === 'D' ? ' cl-winning' : ''}">${d}D</span>` : '')
      + (n ? `<span class="cl-n-count">${n}N</span>` : '')
      + (checked ? `<span class="cl-chk-count">${checked}✓</span>` : '');
  }
  if (el) el.innerHTML = html;
  if (el2) el2.innerHTML = html;
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
    const sep = r.hourStart ? '<tr class="hoursep"><td colspan="9"></td></tr>' : '';
    const dir = (f) => `<td class="col-dir"><button type="button" class="ob-dir ${d[f] || ''}" data-dir="${f}" data-i="${r.i}" data-state="${d[f] || ''}">${d[f] || '·'}</button></td>`;
    return `${sep}<tr data-i="${r.i}" data-time="${r.time}">
      <td class="col-t"><span class="tl">${r.time}–${r.end}</span></td>
      <td><textarea data-f="obs" data-i="${r.i}" placeholder="Observe / Orient…">${esc([d.obs, d.ori].filter(Boolean).join('\n'))}</textarea></td>
      ${dir('marketState')}${dir('vwap')}${dir('seq')}${dir('ddrseq')}
      <td class="col-act"><div class="ag">${ACTIONS.map(a =>
        `<button class="ab ${(d.acts || []).includes(a) ? 'on-' + a : ''}" data-act="${a}" data-i="${r.i}">${a}</button>`).join('')}</div></td>
      <td class="col-b"><select data-f="body" data-i="${r.i}">${opt(BODY, d.body || '')}</select></td>
      <td class="col-m"><select data-f="mind" data-i="${r.i}">${opt(MIND, d.mind || '')}</select></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#obody textarea[data-f]').forEach(t => { autoGrow(t); t.addEventListener('input', () => autoGrow(t)); });
  document.querySelectorAll('#obody .ob-dir[data-dir]').forEach(b => b.onclick = () => {
    const cur = b.dataset.state || '';
    const next = cur === '' ? 'U' : cur === 'U' ? 'D' : cur === 'D' ? 'N' : '';
    b.dataset.state = next; b.className = 'ob-dir ' + next; b.textContent = next || '·';
  });
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
    const dir = (f) => tr.querySelector(`.ob-dir[data-dir="${f}"]`)?.dataset.state || '';
    const acts = [...tr.querySelectorAll('.ab')].filter(b => b.classList.contains('on-' + b.dataset.act)).map(b => b.dataset.act);
    const obs = g('obs'), body = g('body'), mind = g('mind');
    const marketState = dir('marketState'), vwap = dir('vwap'), seq = dir('seq'), ddrseq = dir('ddrseq');
    if (obs || body || mind || marketState || vwap || seq || ddrseq || acts.length) rows.push({ i, obs, marketState, vwap, seq, ddrseq, body, mind, acts });
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

// Reset a single section back to default; the cleared section is autosaved (edits the day).
function resetSection(key) {
  if (key === 'pre') {
    ['pre-trigger', 'pre-cgame', 'pre-goal', 'pre-risk', 'pre-mantra'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    ['pre-chk-sleep', 'pre-chk-food', 'pre-chk-activity', 'pre-w1', 'pre-w3', 'pre-w5', 'pre-w6', 'pre-w8']
      .forEach(f => { const el = $(f); if (el) { el.checked = false; const row = el.closest('.chk-row'); if (row) row.classList.remove('on'); } });
    setGroupValue('grp-emotion', '', emotionAlert);
    setGroupValue('grp-game', '', gameAlert);
    setScaleValue('scale-intensity', '', intensityAlert);
  } else if (key === 'prep') {
    RF_KEYS.forEach(k => setRf(k, false));
    rfNewsTags = []; renderNewsTags(); updateRfBadges();
    ['prep-adr-midline', 'prep-wk-high', 'prep-wk-low', 'prep-wk-cycle'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    BOX_SETS.forEach(s => {
      BOX_KEYS.forEach(k => { const el = boxItem(s.attr, k); if (el) setBoxState(el, ''); });
      BOX_MODEL_KEYS.forEach(k => { const el = document.querySelector(`[data-${s.attr}-model="${k}"]`); if (el) el.value = ''; });
      updateBoxSummary(s.attr, s.summary);
    });
  } else if (key === 'ooda') {
    renderTable({});
  } else if (key === 'post') {
    ['txt-emotion-moment', 'txt-best-trade', 'txt-worst-trade', 'txt-eine-sache', 'txt-max-loss', 'txt-tagesziel',
      'txt-emo-trigger', 'txt-irr-belief', 'txt-reframe', 'txt-learning', 'txt-tmrw'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    ['pm-db1', 'pm-db2', 'pm-db3', 'pm-db4', 'pm-cl1', 'pm-cl2', 'pm-cl3', 'pm-cl4']
      .forEach(f => { const el = $(f); if (el) { el.checked = false; const row = el.closest('.chk-row'); if (row) row.classList.remove('on'); } });
    POST_GROUPS.forEach(g => setGroupValue(g, '', () => {}));
    setMultiGroup('grp-rd-emotion', []);
    setGroupValue('grp-post-emotion', '', postEmotionAlert);
    setPerfScale('scale-perf', ''); setPerfScale('scale-process', ''); setPerfScale('scale-emoctrl', '');
    updateDebrief(); updateClose(); renderPostInsights();
  }
  if ($('j-date').value) scheduleAutosave();
}

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
        <td><button class="btn sm" data-load="${e.date}">open</button> <button class="btn sm" data-del="${e.date}">delete</button></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No days saved yet.</div>';
  document.querySelectorAll('[data-load]').forEach(b => b.onclick = async () => {
    if (loadedDate && loadedDate !== b.dataset.load) await persistDate(loadedDate, true);
    $('j-date').value = b.dataset.load; load(b.dataset.load); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const d = b.dataset.del;
    if (!confirm(`Delete all data for ${d}? This cannot be undone.`)) return;
    try { await DB.deleteJournal(d); } catch (e) { console.error(e); Shell.toast('Delete failed'); return; }
    clearDrafts(d);
    if ($('j-date').value === d) { fillJournal({}); renderTable({}); }
    Shell.toast('Deleted ' + d);
    await renderArchive();
  });
}

$('btnSave').onclick = saveDay;
const _btnSaveFull = $('btnSaveFull'); if (_btnSaveFull) _btnSaveFull.onclick = saveDay;
const _SEC_NAMES = { pre: 'Pre-market', prep: 'Pre-trade prep', ooda: 'OODA live', post: 'Post-market' };
document.querySelectorAll('.sec-reset').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const key = b.dataset.reset;
  if (!confirm(`Reset the "${_SEC_NAMES[key] || key}" section? Its entries will be cleared.`)) return;
  resetSection(key);
}));

// ── Quick trade-log modal (OODA live) → writes to the same trades table ───────
const _ltInst = $('lt-inst');
if (_ltInst && window.TH_CONFIG) _ltInst.innerHTML = (TH_CONFIG.INSTRUMENTS || []).map(i => `<option>${i}</option>`).join('');
function ltPreview() {
  const el = $('lt-preview'); if (!el || !window.Stats) return;
  const d = Stats.deriveTrade({
    entry_price: $('lt-entry').value, stop_price: $('lt-stop').value, exit_price: $('lt-exit').value,
    direction: $('lt-dir').value, rr: $('lt-rr').value, outcome: $('lt-outcome').value,
  });
  el.textContent = d._rr ? `Result: ${fmtR(d._rr)} · ${d._outcome.toUpperCase()}${d._points !== null ? ' · ' + (+d._points).toFixed(2) + ' pts' : ''}` : '';
}
function openTradeLog() {
  const ov = $('lt-overlay'); if (!ov) return;
  $('lt-date').value = $('j-date').value || todayStr();
  const nowRow = document.querySelector('#obody tr.now');
  $('lt-time').value = nowRow ? nowRow.dataset.time : '';
  ['lt-entry', 'lt-stop', 'lt-target', 'lt-exit', 'lt-contracts', 'lt-rr', 'lt-dollar', 'lt-model', 'lt-notes'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  $('lt-outcome').value = ''; $('lt-dir').value = 'LONG';
  ltPreview();
  ov.classList.add('show');
}
function closeTradeLog() { const ov = $('lt-overlay'); if (ov) ov.classList.remove('show'); }
async function saveTradeLog() {
  const num = v => (v === '' || v === null || isNaN(+v) ? null : +v);
  const t = {
    date: $('lt-date').value, entry_time: $('lt-time').value, instrument: $('lt-inst').value, direction: $('lt-dir').value,
    entry_price: num($('lt-entry').value), stop_price: num($('lt-stop').value), target_price: num($('lt-target').value),
    exit_price: num($('lt-exit').value), contracts: num($('lt-contracts').value), rr: num($('lt-rr').value),
    dollar_pnl: num($('lt-dollar').value), outcome: $('lt-outcome').value || null, model: $('lt-model').value, notes: $('lt-notes').value,
  };
  if (!t.date) { Shell.toast('Pick a date'); return; }
  try { await DB.saveTrade(t); Shell.toast('Trade logged'); closeTradeLog(); }
  catch (e) { console.error(e); Shell.toast('Save failed'); }
}
const _ltOpen = $('lt-open');
if (_ltOpen) _ltOpen.addEventListener('click', e => { e.stopPropagation(); openTradeLog(); });
['lt-entry', 'lt-stop', 'lt-exit', 'lt-dir', 'lt-rr', 'lt-outcome'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', ltPreview); });
const _ltSave = $('lt-save'); if (_ltSave) _ltSave.onclick = saveTradeLog;
[$('lt-cancel'), $('lt-cancel2')].forEach(b => { if (b) b.onclick = closeTradeLog; });
const _ltOv = $('lt-overlay'); if (_ltOv) _ltOv.addEventListener('click', e => { if (e.target === _ltOv) closeTradeLog(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const ov = $('lt-overlay'); if (ov && ov.classList.contains('show')) closeTradeLog(); } });
$('jExpand').addEventListener('click', () => document.querySelectorAll('.jsection').forEach(s => s.classList.remove('collapsed')));
$('jCollapse').addEventListener('click', () => document.querySelectorAll('.jsection').forEach(s => s.classList.add('collapsed')));
// Post-market reflection wizard steps
function goPmStep(n) {
  document.querySelectorAll('.pm-step').forEach(s => s.style.display = (+s.dataset.step === n ? '' : 'none'));
  document.querySelectorAll('.pm-pip').forEach(p => { const i = +p.dataset.pip; p.classList.toggle('done', i < n); p.classList.toggle('active', i === n); });
  const labels = ['01 / 04 — Daily result', '02 / 04 — Emotions', '03 / 04 — Setups & execution', '04 / 04 — Intentions for tomorrow'];
  const el = $('pm-steplabel'); if (el) el.textContent = labels[n];
}
document.querySelectorAll('[data-pmnext]').forEach(b => b.addEventListener('click', () => goPmStep(+b.dataset.pmnext)));
document.querySelectorAll('[data-pmprev]').forEach(b => b.addEventListener('click', () => goPmStep(+b.dataset.pmprev)));
$('j-date').addEventListener('change', async () => {
  clearTimeout(autoTimer);
  if (loadedDate && loadedDate !== $('j-date').value) await persistDate(loadedDate, true);
  load($('j-date').value);
});

// Auto-save on any edit: instant local draft + debounced cloud push
const mainEl = document.querySelector('main');
mainEl.addEventListener('input', e => { if (e.target.id !== 'j-date') scheduleAutosave(); });
mainEl.addEventListener('change', e => { if (e.target.id !== 'j-date') scheduleAutosave(); });
mainEl.addEventListener('click', e => { if (e.target.closest('.tog, .scale-btn, .ab, .ob-dir, .cl-item, .rf-item')) scheduleAutosave(); });
window.addEventListener('pagehide', () => { const d = $('j-date').value; if (d) writeDrafts(d); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistDate($('j-date').value, true); });
document.querySelectorAll('.sec-head').forEach(h =>
  h.addEventListener('click', () => h.closest('.jsection').classList.toggle('collapsed')));
document.querySelectorAll('.chk-row input[type=checkbox]').forEach(cb =>
  cb.addEventListener('change', () => { cb.closest('.chk-row').classList.toggle('on', cb.checked); updateDebrief(); updateClose(); }));

// Single-select toggle button groups (emotion, game) with contextual alerts
[['grp-emotion', emotionAlert], ['grp-game', gameAlert], ['grp-post-emotion', postEmotionAlert]].forEach(([gid, alertFn]) => {
  const g = $(gid); if (!g) return;
  g.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => {
    const was = b.classList.contains('active');
    g.querySelectorAll('.tog').forEach(x => x.classList.remove('active'));
    if (!was) b.classList.add('active');
    alertFn(b.classList.contains('active') ? b : null);
  }));
});
// Post-market reflection: single-select groups + multi-select emotions + live insights
POST_GROUPS.forEach(gid => {
  const g = $(gid); if (!g) return;
  g.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => {
    const was = b.classList.contains('active');
    g.querySelectorAll('.tog').forEach(x => x.classList.remove('active'));
    if (!was) b.classList.add('active');
    renderPostInsights();
  }));
});
const _rdEmotion = $('grp-rd-emotion');
if (_rdEmotion) _rdEmotion.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => { b.classList.toggle('active'); renderPostInsights(); }));
const _eineSache = $('txt-eine-sache');
if (_eineSache) _eineSache.addEventListener('input', renderPostInsights);
// Intensity 1–10 scale (click again on the selected number to reset)
const _si = $('scale-intensity');
if (_si) _si.querySelectorAll('.scale-btn').forEach(b => b.addEventListener('click', () => {
  const wasSel = b.classList.contains('sel-green') || b.classList.contains('sel-amber') || b.classList.contains('sel-coral');
  _si.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
  if (wasSel) { intensityAlert(0); return; }
  const v = +b.dataset.v; b.classList.add(v >= 8 ? 'sel-coral' : v >= 5 ? 'sel-amber' : 'sel-green');
  intensityAlert(v);
}));
const _sp = $('scale-perf');
if (_sp) _sp.querySelectorAll('.scale-btn').forEach(b => b.addEventListener('click', () => {
  const wasSel = b.classList.contains('sel-green') || b.classList.contains('sel-amber') || b.classList.contains('sel-coral');
  _sp.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
  if (wasSel) return;
  const v = +b.dataset.v; b.classList.add(v >= 8 ? 'sel-green' : v >= 5 ? 'sel-amber' : 'sel-coral');
}));
// Performance-Bewertung: process quality + emotional control (higher is better)
['scale-process', 'scale-emoctrl'].forEach(sid => {
  const s = $(sid); if (!s) return;
  s.querySelectorAll('.scale-btn').forEach(b => b.addEventListener('click', () => {
    const wasSel = b.classList.contains('sel-green') || b.classList.contains('sel-amber') || b.classList.contains('sel-coral');
    s.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('sel-green', 'sel-amber', 'sel-coral'));
    if (wasSel) return;
    const v = +b.dataset.v; b.classList.add(v >= 8 ? 'sel-green' : v >= 5 ? 'sel-amber' : 'sel-coral');
  }));
});

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
