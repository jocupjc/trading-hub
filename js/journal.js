// ─── Pre / Post market daily journal ─────────────────────────────────────────
Shell.mount('pages/journal.html', '../');

const $ = (id) => document.getElementById(id);
const FIELDS = ['pre-context', 'pre-bias', 'pre-game', 'pre-setups', 'pre-goal', 'pre-risk',
  'post-rules', 'post-score', 'post-best', 'post-worst', 'post-emotion', 'post-tomorrow'];

$('j-date').value = todayStr();

function readForm() { const o = {}; FIELDS.forEach(f => o[f] = $(f).value); return o; }
function fillForm(p) { FIELDS.forEach(f => $(f).value = (p && p[f]) || ''); }

async function load(date) {
  let p = null;
  try { p = await DB.getJournal(date, 'daily'); } catch (e) { console.error(e); }
  fillForm(p || {});
}

async function save() {
  const date = $('j-date').value;
  if (!date) return Shell.toast('Pick a date');
  try { await DB.saveJournal(date, 'daily', readForm()); Shell.toast('Saved ' + date); await renderArchive(); }
  catch (e) { console.error(e); Shell.toast('Save failed'); }
}

async function renderArchive() {
  let list; try { list = await DB.listJournal('daily'); } catch { list = []; }
  $('archive').innerHTML = list.length
    ? `<table class="data"><thead><tr><th>Date</th><th>Updated</th><th></th></tr></thead><tbody>${list.map(e => `
        <tr><td class="mono">${e.date}</td><td class="mono" style="color:var(--mu)">${(e.updated_at || '').slice(0, 16).replace('T', ' ')}</td>
        <td><button class="btn sm" data-load="${e.date}">open</button></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No days saved yet.</div>';
  document.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { $('j-date').value = b.dataset.load; load(b.dataset.load); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

$('btnSave').onclick = save;
$('j-date').addEventListener('change', () => load($('j-date').value));
load(todayStr());
renderArchive();
