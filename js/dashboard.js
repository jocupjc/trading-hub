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

function tile(lbl, val, sub, valClass) {
  return `<div class="stat"><div class="lbl">${lbl}</div><div class="val ${valClass || ''}">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

function filterByRange(trades, range) {
  const now = new Date();
  if (range === '30') { const c = new Date(now); c.setDate(c.getDate() - 30); const cs = c.toISOString().slice(0, 10); return trades.filter(t => t.date >= cs); }
  if (range === 'ytd' || range === ' y') { const y = now.getFullYear() + '-01-01'; return trades.filter(t => t.date >= y); }
  return trades;
}

async function render() {
  const range = document.getElementById('range').value;
  let trades;
  try { trades = await DB.getTrades(); }
  catch (e) { console.error(e); Shell.toast('Load failed — check Supabase config'); trades = []; }
  trades = filterByRange(trades, range);
  const s = Stats.compute(trades);

  // Headline tiles
  document.getElementById('tiles').innerHTML = [
    tile('Total PnL (R)', fmtR(s.totalR), `${s.count} trades`, cls(s.totalR)),
    tile('Total PnL ($)', s.totalDollar ? fmtD(s.totalDollar) : '—', 'from $ column', cls(s.totalDollar)),
    tile('Win Rate', s.count ? s.winRate + '%' : '—', `${s.wins}W · ${s.losses}L · ${s.bes}BE`, s.winRate >= 50 ? 'pos' : s.winRate ? 'neu' : ''),
    tile('Expectancy', s.count ? fmtR(s.expectancy) : '—', 'per trade', cls(s.expectancy)),
  ].join('');

  // Secondary tiles
  document.getElementById('tiles2').innerHTML = [
    tile('Avg Winner', fmtR(s.avgWinnerR), 'in R', 'pos'),
    tile('Avg Loser', fmtR(s.avgLoserR), 'target ≈ -1R', 'neg'),
    tile('Best Winner', fmtR(s.bestWinnerR), 'open R (max)', 'pos'),
    tile('Largest Loss', fmtR(s.largestLossR), 'should ≈ -1R', 'neg'),
    tile('Profit Factor', s.profitFactor === Infinity ? '∞' : s.profitFactor, 'wins ÷ losses', s.profitFactor >= 1 ? 'pos' : 'neg'),
    tile('Avg Contracts', s.avgContracts || '—', 'size per trade'),
    tile('Avg Points', s.avgPoints || '—', 'per trade'),
    tile('Max Drawdown', fmtR(s.maxDD), 'peak-to-trough', 'neg'),
    tile('Days Green', String(s.greenDays), 'plus days', 'pos'),
    tile('Days Red', String(s.redDays), 'minus days', 'neg'),
    tile('Days B/E', String(s.beDays), 'break-even', 'neu'),
    tile('Best / Worst Day', s.bestDay ? `${fmtR(s.bestDay.r)} / ${fmtR(s.worstDay.r)}` : '—', 'performance score'),
  ].join('');

  // Charts — each trade is its own point/bar
  drawLine('chartEqR', [{ x: 0, y: 0, label: 'Start' }].concat(s.equityR), fmtR, '#4f8ef7');
  drawBars('chartTradeR', s.tradeR, fmtR);
  drawScatter('chartScatter', s.tradeR, fmtR);

  // Insights
  document.getElementById('insights').innerHTML =
    Stats.insights(s).map(i => `<div class="insight ${i.type}">${i.text}</div>`).join('');
}

// Options for category-based line/bar charts (one slot per trade)
function catOptions(fmt, meta) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      title: (items) => (meta[items[0].dataIndex] && meta[items[0].dataIndex].label) || '',
      label: (item) => fmt(item.parsed.y),
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
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.x),
      datasets: [{ data: data.map(d => d.y),
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
