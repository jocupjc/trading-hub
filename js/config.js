// ─────────────────────────────────────────────────────────────────────────────
// Supabase configuration
// ─────────────────────────────────────────────────────────────────────────────
// The anon (public) key is SAFE to expose in a client-side app *as long as* you
// enable Row Level Security (RLS) on your tables — see supabase/schema.sql.
//
// 1. Create a project at https://supabase.com
// 2. Project Settings → API → copy "Project URL" and the "anon public" key
// 3. Paste them below.
// 4. Run the SQL in supabase/schema.sql in the Supabase SQL editor.
//
// Until these are filled in, the whole app transparently falls back to the
// browser's localStorage so you can start journaling immediately.
// ─────────────────────────────────────────────────────────────────────────────

window.TH_CONFIG = {
  // Base project URL only — no '/rest/v1/' suffix.
  SUPABASE_URL: 'https://ncsyrwuncvtaqxjsqiig.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3lyd3VuY3Z0YXF4anNxaWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjM0NTIsImV4cCI6MjEwMzIzOTQ1Mn0.AP85Y3okc-oZcu-NqgeGKYCqfUTwb0dLYRbBqZyrW7g',

  // Storage bucket used for chart screenshots
  SCREENSHOT_BUCKET: 'screenshots',

  // Optional: default instrument list shown in dropdowns
  INSTRUMENTS: ['ES', 'NQ', 'CL', 'GC', 'MES', 'MNQ'],
};

window.TH_CONFIG.SUPABASE_ENABLED =
  !!(window.TH_CONFIG.SUPABASE_URL && window.TH_CONFIG.SUPABASE_ANON_KEY);
