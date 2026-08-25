// ─── Charts & Screenshots gallery ────────────────────────────────────────────
Shell.mount('pages/gallery.html', '../');

const $ = (id) => document.getElementById(id);
$('a-date').value = todayStr();
$('uploadNote').textContent = DB.active() === 'supabase'
  ? 'Screenshots upload to Supabase storage (public bucket).'
  : 'Offline mode: screenshots are stored in this browser as data URLs — keep them small, or configure Supabase for real storage.';

$('a-kind').addEventListener('change', () => {
  const isShot = $('a-kind').value === 'screenshot';
  $('wrap-url').style.display = isShot ? 'none' : 'block';
  $('wrap-file').style.display = isShot ? 'block' : 'none';
});

async function add() {
  const date = $('a-date').value;
  const title = $('a-title').value.trim();
  const kind = $('a-kind').value;
  if (!date) return Shell.toast('Pick a date');

  try {
    if (kind === 'screenshot') {
      const file = $('a-file').files[0];
      if (!file) return Shell.toast('Choose an image');
      Shell.toast('Uploading…');
      const { url, storage_path } = await DB.uploadScreenshot(file, date);
      await DB.saveLink({ date, title: title || file.name, kind: 'screenshot', url, storage_path });
    } else {
      const url = $('a-url').value.trim();
      if (!url) return Shell.toast('Paste a URL');
      await DB.saveLink({ date, title: title || url, kind: 'link', url });
    }
    Shell.toast('Added');
    $('a-title').value = ''; $('a-url').value = ''; $('a-file').value = '';
    await refresh();
  } catch (e) { console.error(e); Shell.toast('Failed — ' + (e.message || 'error')); }
}

async function refresh() {
  let links; try { links = await DB.getLinks(); } catch { links = []; }
  const years = [...new Set(links.map(l => l.year))].sort((a, b) => b - a);
  const cur = $('yearFilter').value;
  $('yearFilter').innerHTML = '<option value="">All years</option>' + years.map(y => `<option>${y}</option>`).join('');
  if (cur) $('yearFilter').value = cur;

  const filterY = $('yearFilter').value;
  const shown = filterY ? links.filter(l => String(l.year) === filterY) : links;

  // Group by year → then render
  const byYear = {};
  shown.forEach(l => (byYear[l.year] = byYear[l.year] || []).push(l));
  const yr = Object.keys(byYear).sort((a, b) => b - a);

  $('galWrap').innerHTML = yr.length ? yr.map(y => `
    <div class="card" style="margin-bottom:16px">
      <div class="card-label">${y} — ${byYear[y].length} item${byYear[y].length > 1 ? 's' : ''}</div>
      <div class="gal-grid">
        ${byYear[y].map(l => card(l)).join('')}
      </div>
    </div>`).join('') : '<div class="empty">No charts saved yet.</div>';

  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this item?')) return;
    await DB.deleteLink(b.dataset.del); Shell.toast('Deleted'); refresh();
  });
}

function card(l) {
  const thumb = l.kind === 'screenshot'
    ? `<img src="${l.url}" onclick="window.open('${l.url}','_blank')" alt="">`
    : `<a class="gal-thumb-link" href="${l.url}" target="_blank">📈</a>`;
  return `
    <div class="gal-card">
      ${thumb}
      <div class="gal-body">
        <div class="gal-title">${esc(l.title) || 'Untitled'}</div>
        <div class="gal-meta">${l.date || '—'} · ${l.kind}</div>
        <div class="gal-actions">
          <a class="btn sm" href="${l.url}" target="_blank">open</a>
          <button class="btn sm danger" data-del="${l.id}">del</button>
        </div>
      </div>
    </div>`;
}

$('btnAdd').onclick = add;
$('yearFilter').addEventListener('change', refresh);
Auth.ready.then(refresh);
