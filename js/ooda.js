// ─── OODA Live Journal ───────────────────────────────────────────────────────
Shell.mount('pages/ooda.html', '../');

const $ = (id) => document.getElementById(id);
const ALGO = ['', 'ASS DOWN', 'ASS UP', 'MCR', 'Ranging'];
const ACTIONS = ['WAIT', 'HUNT', 'ENTER', 'TRAIL', 'STOP'];
const BODY = ['', 'Regulated', 'Energized', 'Anxious', 'Euphoric', 'Stressed'];
const MIND = ['', 'Focused', 'Neutral', 'Scattered'];
let ROWS = [];

$('o-date').value = todayStr();

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
  ROWS = buildRows($('o-window').value);
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

  document.querySelectorAll('textarea[data-f]').forEach(t => { autoGrow(t); t.addEventListener('input', () => autoGrow(t)); });
  document.querySelectorAll('.ab[data-act]').forEach(b => b.onclick = () => {
    const wasOn = b.classList.contains('on-' + b.dataset.act);
    document.querySelectorAll(`.ab[data-i="${b.dataset.i}"]`).forEach(x => x.className = 'ab');
    if (!wasOn) b.classList.add('on-' + b.dataset.act);
  });
  highlightNow();
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

function collect() {
  const rows = [];
  document.querySelectorAll('#obody tr[data-i]').forEach(tr => {
    const i = +tr.dataset.i;
    const g = (f) => tr.querySelector(`[data-f="${f}"]`)?.value || '';
    const acts = [...tr.querySelectorAll('.ab')].filter(b => b.classList.contains('on-' + b.dataset.act)).map(b => b.dataset.act);
    const obs = g('obs'), ori = g('ori'), algo = g('algo'), body = g('body'), mind = g('mind');
    if (obs || ori || algo || body || mind || acts.length) rows.push({ i, obs, ori, algo, body, mind, acts });
  });
  return {
    inst: $('o-inst').value, ctx: $('o-ctx').value, lvl: $('o-lvl').value,
    bias: $('o-bias').value, window: $('o-window').value, rows,
  };
}

async function load(date) {
  let p = null; try { p = await DB.getJournal(date, 'ooda'); } catch (e) { console.error(e); }
  p = p || {};
  $('o-inst').value = p.inst || ''; $('o-ctx').value = p.ctx || ''; $('o-lvl').value = p.lvl || '';
  $('o-bias').value = p.bias || ''; if (p.window) $('o-window').value = p.window;
  renderTable(p);
}

async function save() {
  const date = $('o-date').value; if (!date) return Shell.toast('Pick a date');
  try { await DB.saveJournal(date, 'ooda', collect()); Shell.toast('Saved ' + date); }
  catch (e) { console.error(e); Shell.toast('Save failed'); }
}

function highlightNow() {
  const now = new Date();
  const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  document.querySelectorAll('#obody tr[data-time]').forEach(tr => {
    const t = tr.dataset.time; const next = tr.nextElementSibling?.dataset?.time;
    tr.classList.toggle('now', hm >= t && (!next || hm < next));
  });
}

$('btnSave').onclick = save;
$('o-window').addEventListener('change', () => renderTable(collect()));
$('o-date').addEventListener('change', () => load($('o-date').value));
setInterval(highlightNow, 60000);
Auth.ready.then(() => load(todayStr()));
