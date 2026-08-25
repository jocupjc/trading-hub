// ─────────────────────────────────────────────────────────────────────────────
// Auth layer — Supabase email/password login.
// - In local (offline) mode: no login required, resolves immediately.
// - In Supabase mode: shows a login overlay until the user is authenticated.
// Pages should gate their initial data load behind `Auth.ready`.
// ─────────────────────────────────────────────────────────────────────────────

const Auth = (() => {
  const enabled = window.TH_CONFIG.SUPABASE_ENABLED;
  let sb = null, _resolve, _resolved = false;
  const api = { userId: null, email: null, enabled, signOut, refresh: renderAccount };
  api.ready = new Promise((r) => (_resolve = r));

  function done() { if (!_resolved) { _resolved = true; _resolve(api); } }

  async function init() {
    if (!enabled) { done(); return; }
    sb = DB.initSupabase();
    sb.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        api.userId = session.user.id; api.email = session.user.email;
        hideLogin(); renderAccount(); done();
      }
    });
    const { data } = await sb.auth.getSession();
    if (data.session) {
      api.userId = data.session.user.id; api.email = data.session.user.email;
      renderAccount(); done();
    } else {
      showLogin();
    }
  }

  async function signOut() {
    if (sb) { await sb.auth.signOut(); }
    location.reload();
  }

  // ── Login overlay ───────────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById('auth-style')) return;
    const s = document.createElement('style');
    s.id = 'auth-style';
    s.textContent = `
      .auth-overlay{position:fixed;inset:0;z-index:9999;background:rgba(9,11,15,.92);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:var(--font,'IBM Plex Sans',sans-serif);}
      .auth-card{width:340px;max-width:92vw;background:var(--card,#13161e);border:.5px solid var(--bh,rgba(255,255,255,.15));border-radius:14px;padding:26px 26px 22px;color:var(--tx,#e8eaf0);}
      .auth-card h2{font-family:var(--serif,Georgia,serif);font-weight:600;font-size:22px;margin:0 0 4px;}
      .auth-card .sub{font-family:var(--mono,monospace);font-size:11px;color:var(--mu,#6b7280);margin-bottom:18px;}
      .auth-card label{display:block;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.4px;text-transform:uppercase;color:var(--mu,#6b7280);margin:12px 0 5px;}
      .auth-card input{width:100%;background:var(--card2,#181c26);border:.5px solid var(--bh,rgba(255,255,255,.15));border-radius:8px;color:var(--tx,#e8eaf0);font-size:13px;padding:9px 11px;outline:none;}
      .auth-card input:focus{border-color:var(--ac,#4f8ef7);}
      .auth-btn{width:100%;margin-top:18px;background:var(--acg,rgba(79,142,247,.18));border:.5px solid rgba(79,142,247,.4);color:var(--ac,#4f8ef7);font-family:var(--mono,monospace);font-size:12px;letter-spacing:.4px;padding:11px;border-radius:8px;cursor:pointer;}
      .auth-btn:hover{background:rgba(79,142,247,.28);}
      .auth-toggle{margin-top:14px;text-align:center;font-size:12px;color:var(--mu,#6b7280);}
      .auth-toggle a{color:var(--ac,#4f8ef7);cursor:pointer;}
      .auth-msg{margin-top:12px;font-size:12px;line-height:1.5;min-height:16px;}
      .auth-msg.err{color:var(--co,#f87171);} .auth-msg.ok{color:var(--gr,#34d399);}`;
    document.head.appendChild(s);
  }

  let mode = 'signin';
  function showLogin() {
    ensureStyles();
    if (document.getElementById('auth-overlay')) return;
    const o = document.createElement('div');
    o.className = 'auth-overlay'; o.id = 'auth-overlay';
    o.innerHTML = `
      <div class="auth-card">
        <h2>Trading Hub</h2>
        <div class="sub" id="auth-sub">Sign in to your account</div>
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" autocomplete="username" placeholder="you@example.com">
        <label for="auth-pass">Password</label>
        <input type="password" id="auth-pass" autocomplete="current-password" placeholder="••••••••">
        <button class="auth-btn" id="auth-submit">Sign in</button>
        <div class="auth-msg" id="auth-msg"></div>
        <div class="auth-toggle" id="auth-toggle">No account yet? <a id="auth-switch">Create one</a></div>
      </div>`;
    document.body.appendChild(o);
    document.getElementById('auth-submit').onclick = submit;
    document.getElementById('auth-switch').onclick = toggleMode;
    document.getElementById('auth-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
  function hideLogin() { const o = document.getElementById('auth-overlay'); if (o) o.remove(); }

  function toggleMode() {
    mode = mode === 'signin' ? 'signup' : 'signin';
    document.getElementById('auth-sub').textContent = mode === 'signin' ? 'Sign in to your account' : 'Create your account';
    document.getElementById('auth-submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    document.getElementById('auth-toggle').innerHTML = mode === 'signin'
      ? 'No account yet? <a id="auth-switch">Create one</a>'
      : 'Already have an account? <a id="auth-switch">Sign in</a>';
    document.getElementById('auth-switch').onclick = toggleMode;
    setMsg('', '');
  }

  function setMsg(t, cls) { const m = document.getElementById('auth-msg'); if (m) { m.textContent = t; m.className = 'auth-msg ' + (cls || ''); } }

  async function submit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    if (!email || !password) return setMsg('Enter email and password.', 'err');
    setMsg('Working…', '');
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) { setMsg('Account created. Check your email to confirm, then sign in.', 'ok'); mode = 'signin'; return; }
      }
      // onAuthStateChange finishes the flow (hides overlay + resolves ready).
    } catch (e) { setMsg(e.message || 'Authentication failed.', 'err'); }
  }

  // ── Account chip in the sidebar ─────────────────────────────────────────────
  function renderAccount() {
    const host = document.getElementById('account');
    if (!host) return;
    if (enabled && api.email) {
      host.innerHTML = `<div class="acct-email" title="${api.email}">${api.email}</div>
        <button class="acct-out" id="acct-signout">Sign out</button>`;
      const b = document.getElementById('acct-signout'); if (b) b.onclick = signOut;
    } else {
      host.innerHTML = '';
    }
  }

  init();
  window.Auth = api;
  return api;
})();
