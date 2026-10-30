// ─── Trades & PnL ────────────────────────────────────────────────────────────
Shell.mount('pages/trades.html', '../');

const $ = (id) => document.getElementById(id);
const cfg = window.TH_CONFIG;

// Populate instruments
$('f-inst').innerHTML = cfg.INSTRUMENTS.map(i => `<option>${i}</option>`).join('');
$('f-date').value = todayStr();

const fields = ['id', 'date', 'time', 'inst', 'dir', 'entry', 'stop', 'target', 'exit', 'contracts', 'rr', 'dollar', 'outcome', 'model', 'notes'];

function readForm() {
  const g = (k) => $('f-' + k).value;
  return {
    id: g('id') || undefined,
    date: g('date'), entry_time: g('time'), instrument: g('inst'), direction: g('dir'),
    entry_price: numOrNull(g('entry')), stop_price: numOrNull(g('stop')),
    target_price: numOrNull(g('target')), exit_price: numOrNull(g('exit')),
    contracts: numOrNull(g('contracts')), rr: numOrNull(g('rr')),
    dollar_pnl: numOrNull(g('dollar')), outcome: g('outcome') || null,
    model: g('model'), notes: g('notes'),
  };
}
const numOrNull = (v) => (v === '' || v === null || isNaN(+v) ? null : +v);

function fillForm(t) {
  $('f-id').value = t.id || '';
  $('f-date').value = t.date || todayStr();
  $('f-time').value = t.entry_time || '';
  $('f-inst').value = t.instrument || cfg.INSTRUMENTS[0];
  $('f-dir').value = t.direction || 'LONG';
  $('f-entry').value = t.entry_price ?? '';
  $('f-stop').value = t.stop_price ?? '';
  $('f-target').value = t.target_price ?? '';
  $('f-exit').value = t.exit_price ?? '';
  $('f-contracts').value = t.contracts ?? '';
  $('f-rr').value = t.rr ?? '';
  $('f-dollar').value = t.dollar_pnl ?? '';
  $('f-outcome').value = t.outcome || '';
  $('f-model').value = t.model || '';
  $('f-notes').value = t.notes || '';
  syncModelBtns();
  livePreview();
  loadTradeShot(t.id || '');
}

function clearForm() {
  fields.forEach(k => { if (!['date', 'inst', 'dir'].includes(k)) $('f-' + k).value = ''; });
  $('f-date').value = todayStr(); $('f-outcome').value = '';
  $('f-tv-paste').value = '';
  syncModelBtns();
  livePreview();
  TSHOT.data = null; renderTradeShot();
}

// Model / setup quick-pick buttons ↔ the free-text input
function syncModelBtns() {
  const v = $('f-model').value.trim();
  document.querySelectorAll('#f-model-btns .model-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
}
document.querySelectorAll('#f-model-btns .model-btn').forEach(b => b.addEventListener('click', () => {
  $('f-model').value = ($('f-model').value.trim() === b.dataset.v) ? '' : b.dataset.v;
  syncModelBtns();
}));
$('f-model').addEventListener('input', syncModelBtns);

// ── Paste TradingView Long/Short position tool → auto-fill entry/stop/target ──
// TradingView puts the drawing on the clipboard as text/html carrying a
// `data-tradingview-clip` JSON. sources[0].source has the entry (points[0].price),
// direction (type …Long/…Short) and stop/profit levels in TICKS; multiply by the
// instrument tick size to get absolute prices.
const TV_TICK = { ES: 0.25, MES: 0.25, NQ: 0.25, MNQ: 0.25, CL: 0.01, MCL: 0.01, GC: 0.1, MGC: 0.1, RTY: 0.1, M2K: 0.1, YM: 1, MYM: 1 };

function tvSymbolRoot(symbol) {
  // "CME_MINI:ES1!" → "ES"; "MNQ1!" → "MNQ"
  return String(symbol || '').split(':').pop().replace(/[0-9!]+$/, '').toUpperCase();
}

function extractTvClip(html) {
  if (!html) return null;
  let el;
  try { el = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-tradingview-clip]'); }
  catch { return null; }
  if (!el) return null;
  let src;
  try { src = JSON.parse(el.getAttribute('data-tradingview-clip')).sources[0].source; }
  catch { return null; }
  if (!src || !/RiskReward/i.test(src.type || '')) return null;
  const st = src.state || {};
  const isShort = /Short/i.test(src.type);
  const entry = src.points && src.points[0] ? src.points[0].price : null;
  const root = tvSymbolRoot(st.symbol);
  const tick = TV_TICK[root] || 0.25;
  const sign = isShort ? -1 : 1;
  const round = (v) => (v == null ? null : parseFloat((Math.round(v / tick) * tick).toFixed(6)));
  const stop = (entry != null && st.stopLevel != null) ? round(entry - sign * st.stopLevel * tick) : null;
  const target = (entry != null && st.profitLevel != null) ? round(entry + sign * st.profitLevel * tick) : null;
  return { direction: isShort ? 'SHORT' : 'LONG', entry: entry != null ? round(entry) : null, stop, target, symbol: root };
}

function applyTvClip(c) {
  if (c.direction) $('f-dir').value = c.direction;
  if (c.symbol && cfg.INSTRUMENTS.includes(c.symbol)) $('f-inst').value = c.symbol;
  if (c.entry != null) $('f-entry').value = c.entry;
  if (c.stop != null) $('f-stop').value = c.stop;
  if (c.target != null) $('f-target').value = c.target;
  livePreview();
  const parts = [c.direction, c.symbol, c.entry != null ? 'entry' : null, c.stop != null ? 'stop' : null, c.target != null ? 'target' : null].filter(Boolean);
  Shell.toast('Filled from TradingView: ' + parts.join(' · '));
}

$('f-tv-paste').addEventListener('paste', (e) => {
  const cd = e.clipboardData; if (!cd) return;
  const clip = extractTvClip(cd.getData('text/html'));
  if (clip) {
    e.preventDefault();
    applyTvClip(clip);
    $('f-tv-paste').value = `${clip.symbol || ''} ${clip.direction} · entry ${clip.entry} · stop ${clip.stop} · target ${clip.target}`.trim();
  } else {
    Shell.toast('Copy the position tool in TradingView (click it, Ctrl+C), then paste here');
  }
});


// ── Required trade screenshot — paste / drop (same UX as the daily journal) ──
const TSHOT = { data: null };   // { url, storage_path, linkId } | null
let tshotActive = false;

function renderTradeShot() {
  const slot = $('t-shot'); if (!slot) return;
  const s = TSHOT.data;
  slot.innerHTML = (s && s.url)
    ? `<div class="shot-thumb"><img src="${esc(s.url)}" alt="screenshot"><button type="button" class="shot-remove" title="Remove">✕</button></div>`
    : `<div class="shot-empty">＋ paste / drop screenshot (required)</div>`;
}
async function setTradeShotFromFile(file) {
  if (!file || !/^image\//.test(file.type)) return;
  const ph = $('t-shot') && $('t-shot').querySelector('.shot-empty'); if (ph) ph.textContent = 'uploading…';
  try {
    const res = await DB.uploadScreenshot(file, $('f-date').value || todayStr());
    TSHOT.data = { url: res.url, storage_path: res.storage_path || null, linkId: null };
    renderTradeShot();
  } catch (err) { console.error(err); Shell.toast('Upload failed'); renderTradeShot(); }
}
function removeTradeShot() {
  const prev = TSHOT.data;
  TSHOT.data = null; renderTradeShot();
  if (prev && prev.linkId) DB.deleteLink(prev.linkId).then(() => refresh()).catch(e => console.error(e));
}
async function loadTradeShot(tradeId) {
  TSHOT.data = null; renderTradeShot();
  if (!tradeId) return;
  try {
    const links = await DB.getTradeLinks(tradeId);
    const shot = (links || []).find(l => l.kind === 'screenshot');
    if (shot) { TSHOT.data = { url: shot.url, storage_path: shot.storage_path, linkId: shot.id }; renderTradeShot(); }
  } catch (e) { console.error(e); }
}
function openShotOverlay(url) { const ov = $('shot-overlay'); if (ov) { ov.querySelector('img').src = url; ov.classList.add('show'); } }
function closeShotOverlay() { const ov = $('shot-overlay'); if (ov) { ov.classList.remove('show'); ov.querySelector('img').src = ''; } }

(function initTradeShot() {
  const slot = $('t-shot'); if (!slot) return;
  renderTradeShot();
  slot.addEventListener('click', e => {
    if (e.target.closest('.shot-remove')) { e.stopPropagation(); removeTradeShot(); return; }
    const thumb = e.target.closest('.shot-thumb');
    if (thumb) { e.stopPropagation(); if (TSHOT.data && TSHOT.data.url) openShotOverlay(TSHOT.data.url); return; }
    slot.focus();
  });
  slot.addEventListener('mouseenter', () => { tshotActive = true; });
  slot.addEventListener('mouseleave', () => { if (document.activeElement !== slot) tshotActive = false; });
  slot.addEventListener('focus', () => { tshotActive = true; });
  slot.addEventListener('blur', () => { tshotActive = false; });
  slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('dragover'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
  slot.addEventListener('drop', e => { e.preventDefault(); slot.classList.remove('dragover'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setTradeShotFromFile(f); });
  document.addEventListener('paste', e => {
    if (!tshotActive) return;
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of items) { if (it.type && it.type.indexOf('image') === 0) { const f = it.getAsFile(); if (f) { e.preventDefault(); setTradeShotFromFile(f); break; } } }
  });
  const ov = $('shot-overlay'); if (ov) ov.addEventListener('click', closeShotOverlay);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeShotOverlay(); });
})();

// Live R preview from prices
function livePreview() {
  const d = Stats.deriveTrade(readForm());
  const auto = (d._rr || d._rr === 0) ? d._rr.toFixed(2) + 'R' : '';
  $('f-rr-auto').textContent = readForm().rr === null && auto ? '· auto ' + auto : '';
  $('rr-preview').textContent = d._rr ? `Result: ${fmtR(d._rr)} · ${d._outcome.toUpperCase()}${d._points !== null ? ' · ' + d._points.toFixed(2) + ' pts' : ''}` : '';
}
['entry', 'stop', 'exit', 'dir', 'rr', 'outcome'].forEach(k => $('f-' + k).addEventListener('input', livePreview));

async function save() {
  const t = readForm();
  if (!t.date) return Shell.toast('Pick a date');
  if (!TSHOT.data || !TSHOT.data.url) return Shell.toast('Add a screenshot before saving');
  try {
    const saved = await DB.saveTrade(t);
    if (TSHOT.data && !TSHOT.data.linkId) {
      const link = await DB.saveLink({ trade_id: saved.id, date: saved.date || t.date, title: 'trade screenshot', kind: 'screenshot', url: TSHOT.data.url, storage_path: TSHOT.data.storage_path });
      TSHOT.data.linkId = link && link.id;
    }
    Shell.toast('Trade saved');
    fillForm(saved); // keep in edit mode so charts can be attached to this trade
    await refresh();
  } catch (e) { console.error(e); Shell.toast('Save failed'); }
}

async function refresh() {
  let trades;
  try { trades = await DB.getTrades(); } catch { trades = []; }
  const s = Stats.compute(trades);
  window.dispatchEvent(new Event('th:trades-changed'));

  // Totals
  $('totals').innerHTML = [
    `<div class="stat"><div class="lbl">Cumulative R</div><div class="val ${cls(s.totalR)}">${fmtR(s.totalR)}</div><div class="sub">${s.count} trades</div></div>`,
    `<div class="stat"><div class="lbl">Cumulative $</div><div class="val ${cls(s.totalDollar)}">${s.totalDollar ? fmtD(s.totalDollar) : '—'}</div></div>`,
    `<div class="stat"><div class="lbl">Win rate</div><div class="val">${s.count ? s.winRate + '%' : '—'}</div><div class="sub">${s.wins}W · ${s.losses}L · ${s.bes}BE</div></div>`,
    `<div class="stat"><div class="lbl">Green / Red / BE days</div><div class="val"><span class="pos">${s.greenDays}</span> · <span class="neg">${s.redDays}</span> · <span class="neu">${s.beDays}</span></div></div>`,
  ].join('');

  // Daily table — show only the last 5 trading days here (full history in All trades)
  const allDays = [...s.days].reverse();
  const dayRows = allDays.slice(0, 5);
  $('dayTable').innerHTML = `
    <thead><tr><th>Date</th><th>Trades</th><th>Day R</th><th>Day $</th><th>Result</th><th>Running R</th></tr></thead>
    <tbody>${dayRows.length ? dayRows.map(d => `
      <tr>
        <td class="mono">${d.date}</td>
        <td class="mono">${d.trades}</td>
        <td class="mono ${cls(d.r)}">${fmtR(d.r)}</td>
        <td class="mono ${cls(d.dollar)}">${d.dollar ? fmtD(d.dollar) : '—'}</td>
        <td><span class="tag-pill ${d.result === 'plus' ? 'pill-win' : d.result === 'minus' ? 'pill-loss' : 'pill-be'}">${d.result === 'plus' ? 'PLUS' : d.result === 'minus' ? 'EXPENSE' : 'B/E'}</span></td>
        <td class="mono ${cls(d.cumR)}">${fmtR(d.cumR)}</td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty">No trades yet.</div></td></tr>'}</tbody>`;
  $('dayNote').textContent = allDays.length > 5 ? `Showing last 5 of ${allDays.length} trading days — full history in “All trades”.` : '';

  // Recent form — last 10 individual trades as green/red/BE dots (oldest → newest)
  const recent = s.rows.slice(-10);
  $('recentForm').innerHTML = recent.length
    ? `<span class="rf-cap">Last ${recent.length} trades</span>` + recent.map(t => {
        const k = t._outcome === 'win' ? 'win' : t._outcome === 'loss' ? 'loss' : 'be';
        return `<span class="rf-dot ${k}" title="${t.date}${t.entry_time ? ' ' + t.entry_time : ''} · ${fmtR(t._rr)}"></span>`;
      }).join('')
    : '';

  // All trades table (newest first)
  const rows = [...s.rows].reverse();
  $('tradeTable').innerHTML = `
    <thead><tr><th>Date</th><th>Time</th><th>Inst</th><th>Dir</th><th>Entry</th><th>Stop</th><th>Exit</th><th>Qty</th><th>R</th><th>$</th><th>Outcome</th><th>Model</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(t => `
      <tr>
        <td class="mono">${t.date}</td>
        <td class="mono">${t.entry_time || '—'}</td>
        <td class="mono">${t.instrument || '—'}</td>
        <td class="mono">${t.direction || '—'}</td>
        <td class="mono">${t.entry_price ?? '—'}</td>
        <td class="mono">${t.stop_price ?? '—'}</td>
        <td class="mono">${t.exit_price ?? '—'}</td>
        <td class="mono">${t.contracts ?? '—'}</td>
        <td class="mono ${cls(t._rr)}">${fmtR(t._rr)}</td>
        <td class="mono ${cls(t._dollar)}">${t._dollar ? fmtD(t._dollar) : '—'}</td>
        <td><span class="tag-pill ${t._outcome === 'win' ? 'pill-win' : t._outcome === 'loss' ? 'pill-loss' : 'pill-be'}">${t._outcome === 'loss' ? 'EXPENSE' : t._outcome.toUpperCase()}</span></td>
        <td>${esc(t.model) || '—'}</td>
        <td class="row" style="gap:4px;flex-wrap:nowrap">
          <button class="btn sm" data-edit="${t.id}">edit</button>
          <button class="btn sm danger" data-del="${t.id}">del</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="13"><div class="empty">No trades yet.</div></td></tr>'}</tbody>`;

  window._trades = trades;
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const t = trades.find(x => x.id === b.dataset.edit); if (t) { fillForm(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this trade?')) return;
    await DB.deleteTrade(b.dataset.del); Shell.toast('Deleted'); refresh();
  });
}

function exportCSV() {
  const s = Stats.compute(window._trades || []);
  const head = ['date', 'time', 'instrument', 'direction', 'entry', 'stop', 'target', 'exit', 'contracts', 'R', 'dollar', 'outcome', 'points', 'model', 'notes'];
  const rows = s.rows.map(t => [t.date, t.entry_time, t.instrument, t.direction, t.entry_price, t.stop_price, t.target_price, t.exit_price, t.contracts, t._rr, t._dollar, t._outcome, t._points, t.model, t.notes]
    .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['\uFEFF' + head.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trades.csv'; a.click(); URL.revokeObjectURL(a.href);
}

$('btnSave').onclick = save;
$('btnClear').onclick = clearForm;
$('btnExport').onclick = exportCSV;
document.querySelectorAll('.sec-head').forEach(h => h.addEventListener('click', () => h.closest('.jsection').classList.toggle('collapsed')));
Auth.ready.then(refresh);
