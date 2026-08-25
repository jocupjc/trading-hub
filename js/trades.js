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
  livePreview();
}

function clearForm() {
  fields.forEach(k => { if (!['date', 'inst', 'dir'].includes(k)) $('f-' + k).value = ''; });
  $('f-date').value = todayStr(); $('f-outcome').value = '';
  livePreview();
}

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
  try { await DB.saveTrade(t); Shell.toast('Trade saved'); clearForm(); await refresh(); }
  catch (e) { console.error(e); Shell.toast('Save failed'); }
}

async function refresh() {
  let trades;
  try { trades = await DB.getTrades(); } catch { trades = []; }
  const s = Stats.compute(trades);

  // Totals
  $('totals').innerHTML = [
    `<div class="stat"><div class="lbl">Cumulative R</div><div class="val ${cls(s.totalR)}">${fmtR(s.totalR)}</div><div class="sub">${s.count} trades</div></div>`,
    `<div class="stat"><div class="lbl">Cumulative $</div><div class="val ${cls(s.totalDollar)}">${s.totalDollar ? fmtD(s.totalDollar) : '—'}</div></div>`,
    `<div class="stat"><div class="lbl">Win rate</div><div class="val">${s.count ? s.winRate + '%' : '—'}</div><div class="sub">${s.wins}W · ${s.losses}L · ${s.bes}BE</div></div>`,
    `<div class="stat"><div class="lbl">Green / Red / BE days</div><div class="val"><span class="pos">${s.greenDays}</span> · <span class="neg">${s.redDays}</span> · <span class="neu">${s.beDays}</span></div></div>`,
  ].join('');

  // Daily table
  const dayRows = [...s.days].reverse();
  $('dayTable').innerHTML = `
    <thead><tr><th>Date</th><th>Trades</th><th>Day R</th><th>Day $</th><th>Result</th><th>Running R</th></tr></thead>
    <tbody>${dayRows.length ? dayRows.map(d => `
      <tr>
        <td class="mono">${d.date}</td>
        <td class="mono">${d.trades}</td>
        <td class="mono ${cls(d.r)}">${fmtR(d.r)}</td>
        <td class="mono ${cls(d.dollar)}">${d.dollar ? fmtD(d.dollar) : '—'}</td>
        <td><span class="tag-pill ${d.result === 'plus' ? 'pill-win' : d.result === 'minus' ? 'pill-loss' : 'pill-be'}">${d.result === 'plus' ? 'PLUS' : d.result === 'minus' ? 'MINUS' : 'B/E'}</span></td>
        <td class="mono ${cls(d.cumR)}">${fmtR(d.cumR)}</td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty">No trades yet.</div></td></tr>'}</tbody>`;

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
        <td><span class="tag-pill ${t._outcome === 'win' ? 'pill-win' : t._outcome === 'loss' ? 'pill-loss' : 'pill-be'}">${t._outcome.toUpperCase()}</span></td>
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
Auth.ready.then(refresh);
