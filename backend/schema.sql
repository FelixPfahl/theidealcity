-- Datenbank des Backends (Cloudflare D1, Jurisdiktion EU). Etappe 1: Login, Entwürfe, Veröffentlichungen.
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'design')),
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('login', 'session')),
  exp INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tokens_email ON tokens (email, kind, created);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS publishes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('publish', 'revert')),
  target TEXT,
  commit_sha TEXT,
  created INTEGER NOT NULL
);
INSERT OR IGNORE INTO users (email, name, role, created) VALUES ('josef@theidealcity.gg', 'Josef', 'owner', strftime('%s','now') * 1000);
