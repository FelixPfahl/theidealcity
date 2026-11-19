// Backend theidealcity.gg (Cloudflare Worker + D1, Jurisdiktion EU). Etappe 1, 19.11.2026:
// Login per Link (Brevo-Mail), Entwürfe mit Vorschau-Link, Veröffentlichen ins Repository (data/inbox/<id>.json),
// die GitHub Action (tools/apply.py) baut ein. Geheimnisse (nur im Cloudflare-Dashboard): GH_TOKEN, BREVO_KEY.
// Variablen: GH_REPO (FelixPfahl/theidealcity), SITE (https://theidealcity.gg), MAIL_FROM (josef@theidealcity.gg).

const DAY = 86400000;
const ORIGINS = [/^https:\/\/theidealcity\.gg$/, /^https:\/\/www\.theidealcity\.gg$/, /^https:\/\/felixpfahl\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
// Was die Rolle "design" (Alina) selbst veröffentlichen darf: Regler der Gestaltung (Präfixe).
// Werkstatt, 19.11.2026: dazu die bestehenden Gestaltungsregler (Schrift ui., Farben col., Plotter plot., Handschrift hand., Effekte fx.)
const DESIGN_PREFIXES = ['type.', 'color.', 'grid.', 'design.', 'ui.', 'col.', 'plot.', 'hand.', 'fx.'];

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.some(r => r.test(o));
  return {
    'Access-Control-Allow-Origin': ok ? o : 'https://theidealcity.gg',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(req, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(req) } });
}
function rnd(n = 32) { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
function shortId() { const a = 'abcdefghijkmnopqrstuvwxyz23456789'; const b = new Uint8Array(12); crypto.getRandomValues(b); return [...b].map(x => a[x % a.length]).join(''); }
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function b64(s) { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); }
async function body(req) { try { return await req.json(); } catch (e) { return {}; } }

async function user(req, env) {
  const h = req.headers.get('Authorization') || ''; const t = h.replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const row = await env.DB.prepare('SELECT u.email, u.name, u.role FROM tokens t JOIN users u ON u.email = t.email WHERE t.hash = ? AND t.kind = ? AND t.exp > ?').bind(await sha(t), 'session', Date.now()).first();
  return row || null;
}

async function sendMail(env, to, name, link) {
  const html = `<p>Hallo ${name},</p><p>hier ist dein Link für die Dev Tools von theidealcity.gg. Er gilt 15 Minuten und nur einmal:</p><p><a href="${link}">Anmelden</a></p><p>Wenn du das nicht angefordert hast, ignoriere diese Mail.</p>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ sender: { name: 'theidealcity.gg', email: env.MAIL_FROM }, to: [{ email: to, name }], subject: 'Anmeldung Dev Tools theidealcity.gg', htmlContent: html })
  });
  if (!r.ok) console.error('Brevo', r.status, (await r.text()).slice(0, 500));
  else console.log('Brevo ok', to);
  return r.ok;
}

async function gh(env, path, opt = {}) {
  return fetch('https://api.github.com/repos/' + env.GH_REPO + path, {
    ...opt,
    headers: { 'Authorization': 'Bearer ' + env.GH_TOKEN, 'Accept': 'application/vnd.github+json', 'User-Agent': 'theidealcity-backend', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.headers || {}) }
  });
}

function checkPayload(p, max = 900000) {
  if (!p || typeof p !== 'object') return 'Leerer Entwurf';
  const keys = Object.keys(p);
  const allowed = ['regler', 'texte', 'korrekturen', 'meta', 'dateien'];
  if (keys.some(k => !allowed.includes(k))) return 'Unbekannter Teil: ' + keys.filter(k => !allowed.includes(k)).join(', ');
  // dateien (Werkstatt, 19.11.2026): Sprites, Klänge, Werkbilder, welt.json aus dem Werkzeug, je {name, b64}
  if (p.dateien !== undefined) {
    if (!Array.isArray(p.dateien) || p.dateien.length > 400) return 'Dateien: ungültige Liste';
    for (const f of p.dateien) { if (!f || typeof f.name !== 'string' || typeof f.b64 !== 'string') return 'Dateien: ungültiger Eintrag'; if (!/^[A-Za-z0-9_\-][A-Za-z0-9_.\-\/]{0,160}$/.test(f.name) || f.name.includes('..')) return 'Dateien: ungültiger Name ' + f.name; }
  }
  const s = JSON.stringify(p); if (s.length > max) return 'Entwurf zu groß';
  return '';
}
function designOnly(p) {
  const r = p.regler || {}; const t = p.texte || {}; const k = p.korrekturen || [];
  const textCount = Object.keys(t.convos || {}).length + Object.keys(t.scenes || {}).length + Object.keys(t.beh || {}).length;
  if (textCount || k.length || (p.dateien && p.dateien.length)) return false;
  return Object.keys(r).every(key => DESIGN_PREFIXES.some(pre => key.startsWith(pre)));
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const url = new URL(req.url); const p = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (p === '/' ) return json(req, { ok: true, name: 'theidealcity backend', stage: 1 });

      // ---------- Login ----------
      if (p === '/auth/link' && req.method === 'POST') {
        const b = await body(req); const email = String(b.email || '').trim().toLowerCase();
        const back = String(b.back || env.SITE + '/de/index.html');
        if (!/^https:\/\/(www\.)?theidealcity\.gg\//.test(back) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(back)) return json(req, { ok: false, error: 'Ungültige Rücksprungadresse' }, 400);
        const u = await env.DB.prepare('SELECT email, name FROM users WHERE email = ?').bind(email).first();
        if (u) {
          const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM tokens WHERE email = ? AND kind = ? AND created > ?').bind(email, 'login', Date.now() - 3600000).first();
          if ((recent && recent.n) < 5) {
            const tok = rnd(24);
            await env.DB.prepare('INSERT INTO tokens (hash, email, kind, exp, created) VALUES (?, ?, ?, ?, ?)').bind(await sha(tok), email, 'login', Date.now() + 15 * 60000, Date.now()).run();
            const link = back + (back.includes('?') ? '&' : '?') + 'dev&login=' + tok;
            await sendMail(env, email, u.name, link);
          }
        }
        return json(req, { ok: true });   // immer ok: verrät nicht, welche Adressen es gibt
      }
      if (p === '/auth/verify' && req.method === 'POST') {
        const b = await body(req); const tok = String(b.token || '');
        const h = await sha(tok);
        const row = await env.DB.prepare('SELECT email FROM tokens WHERE hash = ? AND kind = ? AND exp > ?').bind(h, 'login', Date.now()).first();
        if (!row) return json(req, { ok: false, error: 'Link abgelaufen oder schon benutzt' }, 401);
        await env.DB.prepare('DELETE FROM tokens WHERE hash = ?').bind(h).run();
        const sess = rnd(32);
        await env.DB.prepare('INSERT INTO tokens (hash, email, kind, exp, created) VALUES (?, ?, ?, ?, ?)').bind(await sha(sess), row.email, 'session', Date.now() + 30 * DAY, Date.now()).run();
        await env.DB.prepare('DELETE FROM tokens WHERE exp < ?').bind(Date.now()).run();
        const u = await env.DB.prepare('SELECT email, name, role FROM users WHERE email = ?').bind(row.email).first();
        return json(req, { ok: true, session: sess, user: u });
      }
      if (p === '/auth/logout' && req.method === 'POST') {
        const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
        if (t) await env.DB.prepare('DELETE FROM tokens WHERE hash = ?').bind(await sha(t)).run();
        return json(req, { ok: true });
      }
      if (p === '/me') { const u = await user(req, env); return u ? json(req, { ok: true, user: u }) : json(req, { ok: false }, 401); }

      // ---------- Vorschau (öffentlich, nur mit unratbarer ID) ----------
      const pm = p.match(/^\/p\/([a-z0-9]{12})$/);
      if (pm) {
        const d = await env.DB.prepare('SELECT id, title, payload, created FROM drafts WHERE id = ?').bind(pm[1]).first();
        if (!d) return json(req, { ok: false, error: 'Vorschau nicht gefunden' }, 404);
        return json(req, { ok: true, id: d.id, title: d.title, created: d.created, payload: JSON.parse(d.payload) });
      }

      // ---------- ab hier nur angemeldet ----------
      const u = await user(req, env);
      if (!u) return json(req, { ok: false, error: 'Nicht angemeldet' }, 401);

      if (p === '/drafts' && req.method === 'POST') {
        const b = await body(req); const err = checkPayload(b.payload); if (err) return json(req, { ok: false, error: err }, 400);
        const id = shortId();
        await env.DB.prepare('INSERT INTO drafts (id, email, title, payload, created) VALUES (?, ?, ?, ?, ?)').bind(id, u.email, String(b.title || 'Entwurf').slice(0, 140), JSON.stringify(b.payload), Date.now()).run();
        return json(req, { ok: true, id, preview: env.SITE + '/de/index.html?preview=' + id });
      }
      if (p === '/drafts' && req.method === 'GET') {
        const q = u.role === 'owner' ? env.DB.prepare('SELECT d.id, d.title, d.created, d.email, us.name FROM drafts d LEFT JOIN users us ON us.email = d.email ORDER BY d.created DESC LIMIT 50')
          : env.DB.prepare('SELECT d.id, d.title, d.created, d.email, us.name FROM drafts d LEFT JOIN users us ON us.email = d.email WHERE d.email = ? ORDER BY d.created DESC LIMIT 50').bind(u.email);
        return json(req, { ok: true, drafts: (await q.all()).results });
      }
      if (p === '/publish' && req.method === 'POST') {
        const b = await body(req);
        let payload = b.payload, draftId = b.draft || null;
        if (draftId) { const d = await env.DB.prepare('SELECT payload FROM drafts WHERE id = ?').bind(draftId).first(); if (!d) return json(req, { ok: false, error: 'Entwurf nicht gefunden' }, 404); payload = JSON.parse(d.payload); }
        const err = checkPayload(payload, draftId ? 900000 : 5000000); if (err) return json(req, { ok: false, error: err }, 400);
        if (u.role !== 'owner' && !designOnly(payload)) return json(req, { ok: false, error: 'Diese Änderung darf nur Josef veröffentlichen. Bitte als Entwurf mit Vorschau-Link schicken.' }, 403);
        const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + shortId().slice(0, 6);
        const msg = String(b.message || 'Veröffentlicht aus den Dev Tools').slice(0, 200);
        const file = { id, kind: 'publish', author: u.name, email: u.email, message: msg, draft: draftId, created: new Date().toISOString(), payload };
        const r = await gh(env, '/contents/data/inbox/' + id + '.json', { method: 'PUT', body: JSON.stringify({ message: 'Dev Tools: ' + msg + ' (' + u.name + ')', content: b64(JSON.stringify(file, null, 1)), branch: 'main' }) });
        const j = await r.json(); if (!r.ok) return json(req, { ok: false, error: 'GitHub: ' + (j.message || r.status) }, 502);
        await env.DB.prepare('INSERT INTO publishes (id, email, message, kind, target, commit_sha, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, u.email, msg, 'publish', draftId, j.commit && j.commit.sha || '', Date.now()).run();
        return json(req, { ok: true, id, commit: j.commit && j.commit.sha });
      }
      if (p === '/revert' && req.method === 'POST') {
        if (u.role !== 'owner') return json(req, { ok: false, error: 'Zurückrollen darf nur Josef' }, 403);
        const b = await body(req); const target = String(b.id || ''); if (!/^[0-9]{14}-[a-z0-9]{6}$/.test(target)) return json(req, { ok: false, error: 'Ungültige ID' }, 400);
        const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + shortId().slice(0, 6);
        const file = { id, kind: 'revert', target, author: u.name, email: u.email, message: 'Zurückgerollt: ' + target, created: new Date().toISOString() };
        const r = await gh(env, '/contents/data/inbox/' + id + '.json', { method: 'PUT', body: JSON.stringify({ message: 'Dev Tools: zurückrollen ' + target + ' (' + u.name + ')', content: b64(JSON.stringify(file, null, 1)), branch: 'main' }) });
        const j = await r.json(); if (!r.ok) return json(req, { ok: false, error: 'GitHub: ' + (j.message || r.status) }, 502);
        await env.DB.prepare('INSERT INTO publishes (id, email, message, kind, target, commit_sha, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, u.email, file.message, 'revert', target, j.commit && j.commit.sha || '', Date.now()).run();
        return json(req, { ok: true, id });
      }
      if (p === '/history') {
        const rows = (await env.DB.prepare('SELECT p.id, p.message, p.kind, p.target, p.created, us.name FROM publishes p LEFT JOIN users us ON us.email = p.email ORDER BY p.created DESC LIMIT 40').all()).results;
        // Status: liegt data/applied/<id>.json schon im Repository?
        const r = await gh(env, '/contents/data/applied?ref=main'); const list = r.ok ? await r.json() : [];
        const done = new Set((Array.isArray(list) ? list : []).map(f => f.name.replace(/\.json$/, '')));
        const fail = new Set((Array.isArray(list) ? list : []).filter(f => /\.failed\.json$/.test(f.name)).map(f => f.name.replace(/\.failed\.json$/, '')));
        return json(req, { ok: true, items: rows.map(x => ({ ...x, status: fail.has(x.id) ? 'fehler' : done.has(x.id) ? 'eingebaut' : 'wartet' })) });
      }
      if (p === '/users' && req.method === 'POST') {
        if (u.role !== 'owner') return json(req, { ok: false, error: 'Nur Josef' }, 403);
        const b = await body(req); const email = String(b.email || '').trim().toLowerCase(); const role = b.role === 'owner' ? 'owner' : 'design';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { ok: false, error: 'Ungültige Adresse' }, 400);
        await env.DB.prepare('INSERT OR REPLACE INTO users (email, name, role, created) VALUES (?, ?, ?, ?)').bind(email, String(b.name || email).slice(0, 60), role, Date.now()).run();
        return json(req, { ok: true });
      }
      if (p === '/users' && req.method === 'GET') {
        if (u.role !== 'owner') return json(req, { ok: false, error: 'Nur Josef' }, 403);
        return json(req, { ok: true, users: (await env.DB.prepare('SELECT email, name, role FROM users').all()).results });
      }
      return json(req, { ok: false, error: 'Nicht gefunden' }, 404);
    } catch (e) {
      return json(req, { ok: false, error: 'Serverfehler: ' + (e && e.message || e) }, 500);
    }
  }
};
