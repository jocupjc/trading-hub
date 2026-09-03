// ─────────────────────────────────────────────────────────────────────────────
// Monthly statistics — reuses the dashboard's Stats engine, grouped per month.
// Each month gets the same tiles + equity curve + automatic-support insights.
// ─────────────────────────────────────────────────────────────────────────────
Shell.mount('pages/monthly.html', '../');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const CHARTS = {};

function tile(lbl, val, sub, valClass) {
  return `<div class="stat"><div class="lbl">${lbl}</div><div class="val ${valClass || ''}">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

function drawLine(id, points, color) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  if (CHARTS[id]) CHARTS[id].destroy();
  CHARTS[id] = new Chart(el, {
    type: 'line',
    data: { labels: points.map((p) => p.label || p.x),
      datasets: [{ data: points.map((p) => p.y), borderColor: color, backgroundColor: 'rgba(79,142,247,.08)', fill: true, tension: .25, pointRadius: 0, borderWidth: 1.5 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        title: (i) => i[0].raw && i[0].raw.label || '', label: (i) => fmtR(i.parsed.y) } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', font: { family: 'IBM Plex Mono', size: 10 } } },
      },
    },
  });
}

function monthCard(key, s, rv) {
  const [y, m] = key.split('-');
  const name = `${MONTHS[+m - 1]} ${y}`;
  const headline = [
    tile('Total PnL (R)', fmtR(s.totalR), `${s.count} trades`, cls(s.totalR)),
    tile('Total PnL ($)', s.totalDollar ? fmtD(s.totalDollar) : '—', 'from $ column', cls(s.totalDollar)),
    tile('Win Rate', s.count ? s.winRate + '%' : '—', `${s.wins}W · ${s.losses}L · ${s.bes}BE`, s.winRate >= 50 ? 'pos' : s.winRate ? 'neu' : ''),
    tile('Expectancy', s.count ? fmtR(s.expectancy) : '—', 'per trade', cls(s.expectancy)),
  ].join('');
  const secondary = [
    tile('Avg Winner', fmtR(s.avgWinnerR), 'in R', 'pos'),
    tile('Avg Loser', fmtR(s.avgLoserR), 'target ≈ -1R', 'neg'),
    tile('Best Winner', fmtR(s.bestWinnerR), 'open R (max)', 'pos'),
    tile('Largest Loss', fmtR(s.largestLossR), 'should ≈ -1R', 'neg'),
    tile('Profit Factor', s.profitFactor === Infinity ? '∞' : s.profitFactor, 'wins ÷ losses', s.profitFactor >= 1 ? 'pos' : 'neg'),
    tile('Avg Contracts', s.avgContracts || '—', 'size per trade'),
    tile('Avg Points', s.avgPoints || '—', 'per trade'),
    tile('Max Drawdown', fmtR(s.maxDD), 'peak-to-trough', 'neg'),
  ].join('');
  const dayStats = [
    tile('Days Green', String(s.greenDays), 'plus days', 'pos'),
    tile('Days Red', String(s.redDays), 'minus days', 'neg'),
    tile('Days B/E', String(s.beDays), 'break-even', 'neu'),
    tile('Best / Worst Day', s.bestDay ? `${fmtR(s.bestDay.r)} / ${fmtR(s.worstDay.r)}` : '—', 'performance score'),
  ].join('');
  const insights = Stats.insights(s).map((i) => `<div class="insight ${i.type}">${i.text}</div>`).join('');

  const scoreCls = (v) => (v == null ? '' : v >= 7 ? 'pos' : v >= 4 ? 'neu' : 'neg');
  const scoreVal = (v) => (v == null ? '—' : v.toFixed(1));
  const dayN = (n) => `avg · ${n} day${n === 1 ? '' : 's'}`;
  const reviewRow = [
    tile('Performance self score', scoreVal(rv.perf), dayN(rv.perfN), scoreCls(rv.perf)),
    tile('Prozessqualität', scoreVal(rv.process), dayN(rv.processN), scoreCls(rv.process)),
    tile('Emotionale Kontrolle', scoreVal(rv.emoctrl), dayN(rv.emoctrlN), scoreCls(rv.emoctrl)),
  ].join('');

  return `<div class="mo-card" data-month="${key}">
    <button class="mo-head">
      <span class="mo-title">${name}</span>
      <span class="mo-meta"><span class="mo-badge ${cls(s.totalR)}">${fmtR(s.totalR)}</span><span class="mo-sub">${s.count} trades · ${s.count ? s.winRate + '% WR' : 'no WR'}</span><span class="mo-chev">▾</span></span>
    </button>
    <div class="mo-body">
      <div class="grid g4">${headline}</div>
      <div class="mo-row2">
        <div class="card"><div class="card-label">Daily result (R)</div>${Stats.monthGridHTML(+y, +m - 1, s.days)}</div>
        <div class="card mo-eqcard"><div class="card-label">Equity Curve — cumulative R</div><div class="chart-box"><canvas id="eq-${key}"></canvas></div><div class="grid g2 mo-daystats">${dayStats}</div></div>
      </div>
      <div class="grid g4" style="margin-top:14px">${secondary}</div>
      <div class="card" style="margin-top:14px"><div class="card-label">Post-market review — score averages</div><div class="grid g3">${reviewRow}</div></div>
      <div class="card" style="margin-top:14px"><div class="card-label">Automatic support — what the numbers are telling you</div>${insights}</div>
    </div>
  </div>`;
}

function render(trades, reviews) {
  const byMonth = {};
  (trades || []).forEach((t) => {
    const k = (t.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(k)) return;
    (byMonth[k] = byMonth[k] || []).push(t);
  });
  const reviewsByMonth = {};
  (reviews || []).forEach((e) => {
    const k = (e.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(k)) return;
    (reviewsByMonth[k] = reviewsByMonth[k] || []).push(e);
  });
  const keys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a)); // newest month first
  const root = document.getElementById('mo-root');
  if (!keys.length) { root.innerHTML = '<div class="empty">No trades logged yet. Log trades to see monthly statistics.</div>'; return; }

  const statsByKey = {};
  keys.forEach((k) => { statsByKey[k] = Stats.compute(byMonth[k]); });
  root.innerHTML = keys.map((k) => monthCard(k, statsByKey[k], Stats.reviewAverages(reviewsByMonth[k]))).join('');
  keys.forEach((k) => drawLine('eq-' + k, [{ x: 0, y: 0, label: 'Start' }].concat(statsByKey[k].equityR), '#4f8ef7'));
}

async function load() {
  let trades, reviews;
  try { trades = await DB.getTrades(); }
  catch (e) { console.error(e); Shell.toast('Load failed — check Supabase config'); trades = []; }
  try { reviews = await DB.getJournalPayloads('daily'); }
  catch (e) { console.error(e); reviews = []; }
  render(trades, reviews);
}

document.getElementById('mo-root').addEventListener('click', (e) => {
  const h = e.target.closest('.mo-head');
  if (h) h.closest('.mo-card').classList.toggle('collapsed');
});
document.getElementById('mo-expand').addEventListener('click', () => document.querySelectorAll('.mo-card').forEach((c) => c.classList.remove('collapsed')));
document.getElementById('mo-collapse').addEventListener('click', () => document.querySelectorAll('.mo-card').forEach((c) => c.classList.add('collapsed')));

(window.Auth && Auth.ready ? Auth.ready : Promise.resolve()).then(load);
