// ─── Dashboard ───────────────────────────────────────────────────────────────
Shell.mount('index.html', '');

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    callbacks: { title: (i) => i[0].raw.label || '', label: (i) => i.dataset._fmt(i.raw.y) } } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 10 } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 10 } } },
  },
};
let charts = {};
let allReviews = null; // cached daily-journal payloads for review-score averages

function tile(lbl, val, sub, valClass) {
  return `<div class="stat"><div class="lbl">${lbl}</div><div class="val ${valClass || ''}">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

// 1–10 review score → colour (higher is better)
const scoreCls = (v) => (v == null ? '' : v >= 7 ? 'pos' : v >= 4 ? 'neu' : 'neg');
async function getReviews() {
  if (allReviews) return allReviews;
  try { allReviews = await DB.getJournalPayloads('daily'); } catch (e) { console.error(e); allReviews = []; }
  return allReviews;
}

function filterByRange(trades, range) {
  const now = new Date();
  if (range === '30') { const c = new Date(now); c.setDate(c.getDate() - 30); const cs = c.toISOString().slice(0, 10); return trades.filter(t => t.date >= cs); }
  if (range === 'ytd' || range === ' y') { const y = now.getFullYear() + '-01-01'; return trades.filter(t => t.date >= y); }
  if (/^\d{4}$/.test(range)) return trades.filter(t => t.date && t.date.slice(0, 4) === range);
  return trades;
}

// Add year options (2026-2028) to the range dropdown, but only for years that have logged trades.
function syncYearOptions(all) {
  const sel = document.getElementById('range');
  if (!sel) return;
  const candidates = [2026, 2027, 2028];
  const present = candidates.filter(y => all.some(t => t.date && t.date.slice(0, 4) === String(y)));
  const prev = sel.value;
  [...sel.querySelectorAll('option')].forEach(o => { if (/^\d{4}$/.test(o.value)) o.remove(); });
  present.forEach(y => { const o = document.createElement('option'); o.value = String(y); o.textContent = String(y); sel.appendChild(o); });
  sel.value = [...sel.options].some(o => o.value === prev) ? prev : 'all';
}

async function render() {
  let all;
  try { all = await DB.getTrades(); }
  catch (e) { console.error(e); Shell.toast('Load failed — check Supabase config'); all = []; }
  syncYearOptions(all);
  const range = document.getElementById('range').value;
  const trades = filterByRange(all, range);
  const s = Stats.compute(trades);

  // Headline tiles
  document.getElementById('tiles').innerHTML = [
    tile('Total PnL (R)', fmtR(s.totalR), `${s.count} trades`, cls(s.totalR)),
    tile('Total PnL ($)', s.totalDollar ? fmtD(s.totalDollar) : '—', 'from $ column', cls(s.totalDollar)),
    tile('Win Rate', s.count ? s.winRate + '%' : '—', `${s.wins}W · ${s.losses}L · ${s.bes}BE`, s.winRate >= 50 ? 'pos' : s.winRate ? 'neu' : ''),
    tile('Expectancy', s.count ? fmtR(s.expectancy) : '—', 'per trade', cls(s.expectancy)),
  ].join('');

  // Secondary tiles
  const acr = `across ${s.count} trade${s.count === 1 ? '' : 's'}`;
  document.getElementById('tiles2').innerHTML = [
    tile('Avg Winner', fmtR(s.avgWinnerR), acr, 'pos'),
    tile('Avg Loser', fmtR(s.avgLoserR), `≈ -1R · ${acr}`, 'neg'),
    tile('Best Winner', fmtR(s.bestWinnerR), acr, 'pos'),
    tile('Largest Loss', fmtR(s.largestLossR), `≈ -1R · ${acr}`, 'neg'),
    tile('Profit Factor', s.profitFactor === Infinity ? '∞' : s.profitFactor, acr, s.profitFactor >= 1 ? 'pos' : 'neg'),
    tile('Avg Contracts', s.avgContracts || '—', acr),
    tile('Avg Points', s.avgPoints || '—', acr),
    tile('Max Drawdown', fmtR(s.maxDD), acr, 'neg'),
    tile('Days Green', String(s.greenDays), 'plus days', 'pos'),
    tile('Days Red', String(s.redDays), 'minus days', 'neg'),
    tile('Days B/E', String(s.beDays), 'break-even', 'neu'),
    tile('Best / Worst Day', s.bestDay ? `${fmtR(s.bestDay.r)} / ${fmtR(s.worstDay.r)}` : '—', 'performance score'),
  ].join('');

  // Post-market review — score averages (from the daily journal, respecting the range)
  const rv = Stats.reviewAverages(filterByRange(await getReviews(), range));
  const reviewEl = document.getElementById('reviewTiles');
  if (reviewEl) {
    const scoreVal = (v) => (v == null ? '—' : v.toFixed(1));
    const dayN = (n) => `avg · ${n} day${n === 1 ? '' : 's'}`;
    reviewEl.innerHTML = [
      tile('Performance self score', scoreVal(rv.perf), dayN(rv.perfN), scoreCls(rv.perf)),
      tile('Prozessqualität', scoreVal(rv.process), dayN(rv.processN), scoreCls(rv.process)),
      tile('Emotionale Kontrolle', scoreVal(rv.emoctrl), dayN(rv.emoctrlN), scoreCls(rv.emoctrl)),
    ].join('');
  }

  // Charts — each trade is its own point/bar
  drawLine('chartEqR', [{ x: 0, y: 0, label: 'Start' }].concat(s.equityR), fmtR, '#4f8ef7');
  drawBars('chartTradeR', s.tradeR, fmtR);
  drawScatter('chartScatter', s.tradeR, fmtR);

  // Insights
  document.getElementById('insights').innerHTML =
    Stats.insights(s).map(i => `<div class="insight ${i.type}">${i.text}</div>`).join('');

  // Current-month calendar — always the current month, from all trades (range-independent)
  const now = new Date();
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const calDays = Stats.compute(all).days;
  const lbl = document.getElementById('monthCalLabel'); if (lbl) lbl.textContent = `${MN[now.getMonth()]} ${now.getFullYear()} — daily result (R)`;
  const cal = document.getElementById('monthCal'); if (cal) cal.innerHTML = Stats.monthGridHTML(now.getFullYear(), now.getMonth(), calDays);
}

// Options for category-based line/bar charts (one slot per trade)
function catOptions(fmt, meta) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      title: (items) => (meta[items[0].dataIndex] && meta[items[0].dataIndex].label) || '',
      label: (item) => fmt(meta[item.dataIndex] && meta[item.dataIndex].y !== undefined ? meta[item.dataIndex].y : item.parsed.y),
    } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 12 } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 10 } } },
    },
  };
}

function drawLine(id, data, fmt, color) {
  const ctx = document.getElementById(id); if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.x),
      datasets: [{ data: data.map(d => d.y), borderColor: color, backgroundColor: color + '22',
        fill: true, tension: .25, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: color, borderWidth: 2 }],
    },
    options: catOptions(fmt, data),
  });
}

function drawBars(id, data, fmt) {
  const ctx = document.getElementById(id); if (charts[id]) charts[id].destroy();
  // Break-even (y===0) has no bar height — plot a slight orange stub so it stays visible
  const mag = Math.max(...data.map(d => Math.abs(d.y)), 1);
  const beStub = mag * 0.08;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.x),
      datasets: [{ data: data.map(d => d.y === 0 ? beStub : d.y),
        backgroundColor: data.map(d => d.y > 0 ? '#34d399' : d.y < 0 ? '#f87171' : '#f59e0b'),
        borderWidth: 0 }],
    },
    options: catOptions(fmt, data),
  });
}

function drawScatter(id, data, fmt) {
  const ctx = document.getElementById(id); if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: [{ data,
      pointBackgroundColor: data.map(d => d.y > 0 ? '#34d399' : d.y < 0 ? '#f87171' : '#f59e0b'),
      pointBorderColor: 'rgba(0,0,0,0)', pointRadius: 5, pointHoverRadius: 7, _fmt: fmt }] },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, title: { display: true, text: 'Trade #', color: '#6b7280', font: { family: 'IBM Plex Mono', size: 10 } }, ticks: { ...CHART_DEFAULTS.scales.x.ticks, stepSize: 1, precision: 0 } },
        y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'R', color: '#6b7280', font: { family: 'IBM Plex Mono', size: 10 } } },
      },
    },
  });
}

document.getElementById('range').addEventListener('change', render);
Auth.ready.then(render);
