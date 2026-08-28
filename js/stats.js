// ─────────────────────────────────────────────────────────────────────────────
// Stats engine — turns a list of trades into every metric the dashboard needs.
// PnL is tracked in R (risk multiples). By convention a full loss = -1R.
// ─────────────────────────────────────────────────────────────────────────────

const Stats = (() => {
  const num = (v) => (v === '' || v === null || v === undefined || isNaN(+v) ? null : +v);

  // Compute R and points from prices when available; otherwise use stored values.
  function deriveTrade(t) {
    const entry = num(t.entry_price), stop = num(t.stop_price), exit = num(t.exit_price);
    const dir = (t.direction || 'LONG').toUpperCase();
    let rr = num(t.rr);
    let points = num(t.points);

    if (entry !== null && stop !== null && exit !== null) {
      const risk = Math.abs(entry - stop);
      if (risk > 0) {
        const raw = dir === 'SHORT' ? (entry - exit) : (exit - entry);
        rr = raw / risk;
        points = dir === 'SHORT' ? (entry - exit) : (exit - entry);
      }
    }
    if (rr === null) rr = 0;

    let outcome = t.outcome;
    if (!outcome) outcome = rr > 0.05 ? 'win' : rr < -0.05 ? 'loss' : 'be';

    return { ...t, _rr: rr, _points: points, _outcome: outcome, _dollar: num(t.dollar_pnl) };
  }

  function compute(trades) {
    const rows = (trades || []).map(deriveTrade)
      .sort((a, b) => (a.date + (a.entry_time || '')).localeCompare(b.date + (b.entry_time || '')));

    const wins = rows.filter(r => r._outcome === 'win');
    const losses = rows.filter(r => r._outcome === 'loss');
    const bes = rows.filter(r => r._outcome === 'be');

    const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
    const avg = (arr, f) => (arr.length ? sum(arr, f) / arr.length : 0);

    const totalR = sum(rows, r => r._rr);
    const totalDollar = sum(rows, r => r._dollar);

    const winRate = rows.length ? (wins.length / rows.length) * 100 : 0;
    const avgWinnerR = avg(wins, r => r._rr);
    const avgLoserR = avg(losses, r => r._rr);
    const bestWinnerR = rows.length ? Math.max(0, ...rows.map(r => r._rr)) : 0;
    const largestLossR = rows.length ? Math.min(0, ...rows.map(r => r._rr)) : 0;
    const expectancy = rows.length ? totalR / rows.length : 0;
    const profitFactor = Math.abs(sum(losses, r => r._rr)) > 0
      ? sum(wins, r => r._rr) / Math.abs(sum(losses, r => r._rr)) : (wins.length ? Infinity : 0);

    const avgContracts = avg(rows.filter(r => num(r.contracts) !== null), r => num(r.contracts));
    const avgPoints = avg(rows.filter(r => r._points !== null), r => r._points);

    // ── Equity curves (cumulative R and $ per trade) ─────────────────────────
    let runR = 0, runD = 0;
    const equityR = [], equityD = [], tradeR = [], tradeD = [];
    rows.forEach((r, i) => {
      runR += r._rr; runD += (r._dollar || 0);
      const label = `${r.date}${r.entry_time ? ' ' + r.entry_time : ''}`;
      equityR.push({ x: i + 1, y: +runR.toFixed(3), label });
      equityD.push({ x: i + 1, y: +runD.toFixed(2), label });
      tradeR.push({ x: i + 1, y: +r._rr.toFixed(3), label, outcome: r._outcome });
      tradeD.push({ x: i + 1, y: +(r._dollar || 0).toFixed(2), label, outcome: r._outcome });
    });

    // ── Per-day aggregation ──────────────────────────────────────────────────
    const byDay = {};
    rows.forEach(r => {
      (byDay[r.date] = byDay[r.date] || { date: r.date, r: 0, dollar: 0, trades: 0 });
      byDay[r.date].r += r._rr; byDay[r.date].dollar += (r._dollar || 0); byDay[r.date].trades++;
    });
    const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    days.forEach(d => { d.r = +d.r.toFixed(2); d.cumR = +(cum += d.r).toFixed(2);
      d.result = d.r > 0.05 ? 'plus' : d.r < -0.05 ? 'minus' : 'be'; });

    const greenDays = days.filter(d => d.result === 'plus').length;
    const redDays = days.filter(d => d.result === 'minus').length;
    const beDays = days.filter(d => d.result === 'be').length;

    // Best/worst single day (as a "performance score" in R)
    const bestDay = days.reduce((b, d) => (!b || d.r > b.r ? d : b), null);
    const worstDay = days.reduce((b, d) => (!b || d.r < b.r ? d : b), null);

    // Max drawdown (in R) from the per-trade equity curve
    let peak = 0, maxDD = 0;
    equityR.forEach(p => { peak = Math.max(peak, p.y); maxDD = Math.min(maxDD, p.y - peak); });

    // ── Streaks ──────────────────────────────────────────────────────────────
    let curStreak = 0, curType = null, maxWin = 0, maxLoss = 0, w = 0, l = 0;
    rows.forEach(r => {
      if (r._outcome === 'win') { w++; l = 0; maxWin = Math.max(maxWin, w); }
      else if (r._outcome === 'loss') { l++; w = 0; maxLoss = Math.max(maxLoss, l); }
    });
    for (let i = rows.length - 1; i >= 0; i--) {
      const o = rows[i]._outcome; if (o === 'be') continue;
      if (curType === null) { curType = o; curStreak = 1; }
      else if (o === curType) curStreak++;
      else break;
    }

    return {
      rows, days,
      count: rows.length, wins: wins.length, losses: losses.length, bes: bes.length,
      totalR: +totalR.toFixed(2), totalDollar: +totalDollar.toFixed(2),
      winRate: +winRate.toFixed(1),
      avgWinnerR: +avgWinnerR.toFixed(2), avgLoserR: +avgLoserR.toFixed(2),
      bestWinnerR: +bestWinnerR.toFixed(2), largestLossR: +largestLossR.toFixed(2),
      expectancy: +expectancy.toFixed(2),
      profitFactor: profitFactor === Infinity ? Infinity : +profitFactor.toFixed(2),
      avgContracts: +avgContracts.toFixed(2), avgPoints: +avgPoints.toFixed(2),
      equityR, equityD, tradeR, tradeD,
      greenDays, redDays, beDays,
      bestDay, worstDay, maxDD: +maxDD.toFixed(2),
      maxWinStreak: maxWin, maxLossStreak: maxLoss,
      currentStreak: curStreak, currentStreakType: curType,
    };
  }

  // ── Automatic support / coaching insights derived from the numbers ──────────
  function insights(s) {
    const out = [];
    if (s.count === 0) { return [{ type: 'info', text: 'No trades logged yet. Add your first trade to unlock analytics.' }]; }

    if (s.largestLossR < -1.15)
      out.push({ type: 'bad', text: `Largest loss is ${s.largestLossR}R — beyond your 1R risk unit. A stop was widened or skipped. Enforce the hard 1R stop, no exceptions.` });
    else if (s.losses > 0 && s.largestLossR >= -1.05)
      out.push({ type: 'good', text: `Largest loss is ${s.largestLossR}R — risk discipline is intact. Losers are capped at ~1R exactly as intended.` });

    if (s.winRate < 40 && s.expectancy > 0)
      out.push({ type: 'info', text: `Win rate is ${s.winRate}% but expectancy is +${s.expectancy}R — you are a low-win-rate, high-R trader. Protect your winners; cutting them early kills the whole edge.` });
    if (s.winRate >= 55 && s.avgWinnerR < Math.abs(s.avgLoserR))
      out.push({ type: 'warn', text: `Win rate is healthy (${s.winRate}%) but avg winner (${s.avgWinnerR}R) is smaller than avg loser (${s.avgLoserR}R). You are winning often but small — let winners run further.` });

    if (s.expectancy > 0) out.push({ type: 'good', text: `Positive expectancy: +${s.expectancy}R per trade over ${s.count} trades. Keep executing the same process.` });
    else out.push({ type: 'bad', text: `Negative expectancy: ${s.expectancy}R per trade. Focus on eliminating your worst setups before adding size.` });

    if (s.profitFactor !== Infinity && s.profitFactor > 0 && s.profitFactor < 1)
      out.push({ type: 'bad', text: `Profit factor ${s.profitFactor} (< 1.0). Gross losses currently exceed gross wins.` });
    else if (s.profitFactor >= 1.5)
      out.push({ type: 'good', text: `Profit factor ${s.profitFactor === Infinity ? '∞' : s.profitFactor} — solid. Wins comfortably outpace losses.` });

    if (s.maxLossStreak >= 3)
      out.push({ type: 'warn', text: `Max losing streak: ${s.maxLossStreak} in a row. Have a rule that pauses trading after ${Math.min(3, s.maxLossStreak)} consecutive losses to break tilt.` });

    if (s.currentStreakType === 'loss' && s.currentStreak >= 2)
      out.push({ type: 'warn', text: `You are currently on a ${s.currentStreak}-loss streak. Reduce size or step away — this is where accounts bleed.` });
    if (s.currentStreakType === 'win' && s.currentStreak >= 3)
      out.push({ type: 'info', text: `${s.currentStreak}-win streak. Watch for winner's tilt / over-sizing — keep risk at your normal unit.` });

    if (s.maxDD <= -5)
      out.push({ type: 'warn', text: `Max drawdown reached ${s.maxDD}R. Verify your risk-of-ruin math: at 1R/trade a ${Math.abs(s.maxDD)}R drawdown is survivable, but a deeper one needs a size cut.` });

    const ruleDays = s.greenDays + s.redDays + s.beDays;
    if (ruleDays) out.push({ type: 'info', text: `Day distribution: ${s.greenDays} green · ${s.redDays} red · ${s.beDays} break-even across ${ruleDays} trading days.` });

    return out;
  }

  // ── Month calendar grid (Mon–Fri) coloured by daily result, showing day R ───
  function monthGridHTML(year, month, days) {
    const byDate = {};
    (days || []).forEach((d) => { byDate[d.date] = d; });
    const pad = (n) => String(n).padStart(2, '0');
    const fmtR = (v) => (v > 0 ? '+' : '') + Number(v).toFixed(1) + 'R';
    const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dim = new Date(year, month + 1, 0).getDate();
    const weeks = []; let week = new Array(7).fill(null);
    for (let dd = 1; dd <= dim; dd++) {
      const dow = (new Date(year, month, dd).getDay() + 6) % 7; // Mon=0 … Sun=6
      week[dow] = dd;
      if (dow === 6) { weeks.push(week); week = new Array(7).fill(null); }
    }
    if (week.some((x) => x !== null)) weeks.push(week);
    const head = WD.map((w) => `<div class="rcal-wd">${w}</div>`).join('');
    const body = weeks.map((wk) => wk.map((dd) => {
      if (dd === null) return '<div class="rcal-empty"></div>';
      const d = byDate[`${year}-${pad(month + 1)}-${pad(dd)}`];
      if (!d || !d.trades) return `<div class="rcal-day"><span class="rcal-date">${dd}</span></div>`;
      const cls = d.result === 'plus' ? 'plus' : d.result === 'minus' ? 'minus' : 'be';
      return `<div class="rcal-day ${cls}"><span class="rcal-date">${dd}</span><span class="rcal-r">${fmtR(d.r)}</span></div>`;
    }).join('')).join('');
    return `<div class="rcal">${head}${body}</div>`;
  }

  return { compute, insights, deriveTrade, monthGridHTML };
})();

window.Stats = Stats;
