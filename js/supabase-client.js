// ─────────────────────────────────────────────────────────────────────────────
// Data layer — one API, two backends.
// If Supabase is configured (js/config.js) it is used. Otherwise everything
// transparently falls back to localStorage so the app works offline / instantly.
// ─────────────────────────────────────────────────────────────────────────────

const DB = (() => {
  let sb = null;
  const cfg = window.TH_CONFIG;

  function initSupabase() {
    if (sb) return sb;
    if (cfg.SUPABASE_ENABLED && window.supabase) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    }
    return sb;
  }

  const ownerId = () => (window.Auth && window.Auth.userId) || undefined;

  const active = () => (sb ? 'supabase' : 'local');

  // ── localStorage helpers ───────────────────────────────────────────────────
  const LS = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(e); }
    },
  };
  const K = {
    trades: 'th:trades',
    days: 'th:trading_days',
    links: 'th:chart_links',
    journal: (d, t) => `th:journal:${t}:${d}`,
    journalIndex: 'th:journal_index',
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  // ── Trades ──────────────────────────────────────────────────────────────────
  async function getTrades() {
    if (sb) {
      const { data, error } = await sb.from('trades').select('*')
        .order('date', { ascending: true }).order('entry_time', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return LS.get(K.trades, []).sort((a, b) =>
      (a.date + (a.entry_time || '')).localeCompare(b.date + (b.entry_time || '')));
  }

  async function saveTrade(t) {
    const row = { ...t };
    if (sb) {
      if (!row.id) delete row.id;
      if (ownerId()) row.user_id = ownerId();
      const { data, error } = await sb.from('trades').upsert(row).select().single();
      if (error) throw error;
      return data;
    }
    const list = LS.get(K.trades, []);
    if (!row.id) { row.id = uid(); row.created_at = new Date().toISOString(); list.push(row); }
    else { const i = list.findIndex(x => x.id === row.id); if (i >= 0) list[i] = row; else list.push(row); }
    LS.set(K.trades, list);
    return row;
  }

  async function deleteTrade(id) {
    if (sb) { const { error } = await sb.from('trades').delete().eq('id', id); if (error) throw error; return; }
    LS.set(K.trades, LS.get(K.trades, []).filter(x => x.id !== id));
  }

  // ── Trading days ────────────────────────────────────────────────────────────
  async function getTradingDays() {
    if (sb) {
      const { data, error } = await sb.from('trading_days').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return LS.get(K.days, []).sort((a, b) => b.date.localeCompare(a.date));
  }

  async function getTradingDay(date) {
    if (sb) {
      const { data, error } = await sb.from('trading_days').select('*').eq('date', date).maybeSingle();
      if (error) throw error;
      return data || null;
    }
    return LS.get(K.days, []).find(d => d.date === date) || null;
  }

  async function saveTradingDay(d) {
    const row = { ...d, updated_at: new Date().toISOString() };
    if (sb) {
      if (ownerId()) row.user_id = ownerId();
      const { data, error } = await sb.from('trading_days').upsert(row).select().single();
      if (error) throw error;
      return data;
    }
    const list = LS.get(K.days, []);
    const i = list.findIndex(x => x.date === row.date);
    if (i >= 0) list[i] = row; else list.push(row);
    LS.set(K.days, list);
    return row;
  }

  // ── Chart links & screenshots ───────────────────────────────────────────────
  async function getLinks(year) {
    if (sb) {
      let q = sb.from('chart_links').select('*').order('created_at', { ascending: false });
      if (year) q = q.eq('year', year);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
    let list = LS.get(K.links, []);
    if (year) list = list.filter(l => l.year === year);
    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // Charts attached to a specific trade
  async function getTradeLinks(tradeId) {
    if (!tradeId) return [];
    if (sb) {
      const { data, error } = await sb.from('chart_links').select('*')
        .eq('trade_id', tradeId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return LS.get(K.links, []).filter(l => l.trade_id === tradeId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  async function saveLink(l) {
    const row = { ...l };
    row.year = row.year || (row.date ? +row.date.slice(0, 4) : new Date().getFullYear());
    if (sb) {
      if (!row.id) delete row.id;
      if (ownerId()) row.user_id = ownerId();
      const { data, error } = await sb.from('chart_links').upsert(row).select().single();
      if (error) throw error;
      return data;
    }
    const list = LS.get(K.links, []);
    if (!row.id) { row.id = uid(); row.created_at = new Date().toISOString(); list.push(row); }
    else { const i = list.findIndex(x => x.id === row.id); if (i >= 0) list[i] = row; else list.push(row); }
    LS.set(K.links, list);
    return row;
  }

  async function deleteLink(id) {
    if (sb) {
      const { data } = await sb.from('chart_links').select('storage_path').eq('id', id).maybeSingle();
      if (data && data.storage_path) await sb.storage.from(cfg.SCREENSHOT_BUCKET).remove([data.storage_path]);
      const { error } = await sb.from('chart_links').delete().eq('id', id); if (error) throw error; return;
    }
    LS.set(K.links, LS.get(K.links, []).filter(x => x.id !== id));
  }

  // Returns { url, storage_path }. In local mode stores a data URL (small images only).
  async function uploadScreenshot(file, dateStr) {
    const year = dateStr ? dateStr.slice(0, 4) : String(new Date().getFullYear());
    if (sb) {
      const uid = (window.Auth && window.Auth.userId) || 'anon';
      const path = `${uid}/${year}/${(dateStr || 'undated')}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await sb.storage.from(cfg.SCREENSHOT_BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from(cfg.SCREENSHOT_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, storage_path: path };
    }
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
    });
    return { url: dataUrl, storage_path: null };
  }

  // ── Journal entries (tool state as JSON) ────────────────────────────────────
  async function getJournal(date, type) {
    if (sb) {
      const { data, error } = await sb.from('journal_entries').select('payload')
        .eq('date', date).eq('type', type).maybeSingle();
      if (error) throw error;
      return data ? data.payload : null;
    }
    return LS.get(K.journal(date, type), null);
  }

  async function listJournal(type) {
    if (sb) {
      let q = sb.from('journal_entries').select('date,type,updated_at').order('date', { ascending: false });
      if (type) q = q.eq('type', type);
      const { data, error } = await q; if (error) throw error; return data || [];
    }
    let idx = LS.get(K.journalIndex, []);
    if (type) idx = idx.filter(e => e.type === type);
    return idx.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Full payloads for a journal type (used for aggregate stats like review-score averages)
  async function getJournalPayloads(type) {
    if (sb) {
      let q = sb.from('journal_entries').select('date,payload').order('date', { ascending: true });
      if (type) q = q.eq('type', type);
      const { data, error } = await q; if (error) throw error; return data || [];
    }
    let idx = LS.get(K.journalIndex, []);
    if (type) idx = idx.filter(e => e.type === type);
    return idx
      .map(e => ({ date: e.date, payload: LS.get(K.journal(e.date, e.type), null) }))
      .filter(x => x.payload);
  }

  async function saveJournal(date, type, payload) {
    if (sb) {
      const row = { date, type, payload, updated_at: new Date().toISOString() };
      if (ownerId()) row.user_id = ownerId();
      const { error } = await sb.from('journal_entries').upsert(row);
      if (error) throw error;
      return;
    }
    LS.set(K.journal(date, type), payload);
    const idx = LS.get(K.journalIndex, []);
    const i = idx.findIndex(e => e.date === date && e.type === type);
    const rec = { date, type, updated_at: new Date().toISOString() };
    if (i >= 0) idx[i] = rec; else idx.push(rec);
    LS.set(K.journalIndex, idx);
  }

  async function deleteJournal(date, type) {
    if (sb) {
      let q = sb.from('journal_entries').delete().eq('date', date);
      if (type) q = q.eq('type', type);
      const { error } = await q; if (error) throw error; return;
    }
    const types = type ? [type] : ['daily', 'ooda'];
    types.forEach(t => { try { localStorage.removeItem(K.journal(date, t)); } catch (e) {} });
    const idx = LS.get(K.journalIndex, []).filter(e => !(e.date === date && (!type || e.type === type)));
    LS.set(K.journalIndex, idx);
  }

  return {
    initSupabase, active,
    getTrades, saveTrade, deleteTrade,
    getTradingDays, getTradingDay, saveTradingDay,
    getLinks, getTradeLinks, saveLink, deleteLink, uploadScreenshot,
    getJournal, listJournal, getJournalPayloads, saveJournal, deleteJournal,
  };
})();

window.DB = DB;
