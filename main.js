/* Atelier Folien für Windows: öffnet die neueste Folien-Datei (Atelier_Folien_*.html) aus Downloads,
   gibt die Dokumentenkamera frei und aktualisiert sich selbst über GitHub. Keine Daten verlassen das Notebook,
   außer der Kopplung mit Pult, die die Folien-Datei selbst aufbaut. */
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain, screen } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PATTERN = /^Atelier_Folien_.*\.html?$/i;
let win = null, current = null, told = null, updateReady = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

/* Google Drive für Desktop: Schultagsordner auf einem Laufwerk G: bis Z: (Meine Ablage oder My Drive) */
let driveCache = null, driveAt = 0;
function driveFolders() {
  if (driveCache && Date.now() - driveAt < 300000) return driveCache;
  const out = [];
  if (process.platform === "win32") {
    for (const L of "GHIJKLMNOPQRSTUVWXYZ") {
      for (const root of ["Meine Ablage", "My Drive"]) {
        const d = L + ":\\" + root + "\\Schule_Material\\00_dateien_für_den_schultag";
        try { if (fs.existsSync(d)) out.push(d); } catch (e) {}
      }
    }
  }
  driveCache = out; driveAt = Date.now();
  return out;
}
/* 00_Schule_heute (füllt der Morgenlauf): die Ordner <Klasse>\heute und der Ordner selbst */
function heuteFolders() {
  const out = [];
  for (const d of driveFolders()) {
    const h = path.join(path.dirname(d), "00_Schule_heute");
    try {
      if (!fs.existsSync(h)) continue;
      for (const k of fs.readdirSync(h)) {
        const sub = path.join(h, k, "heute");
        try { if (fs.statSync(sub).isDirectory()) out.push(sub); } catch (e) {}
      }
      out.push(h);
    } catch (e) {}
  }
  return out;
}
/* Folien-Datei des Tages kommt von selbst: GitHub (Zweig pult, folien/Atelier_Folien_aktuell.html), beim Start und dann stündlich geprüft */
const FOLIEN_URL = "https://raw.githubusercontent.com/FelixPfahl/theidealcity/pult/folien/Atelier_Folien_aktuell.html";
function autoDir() { const d = path.join(app.getPath("userData"), "folien"); try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} return d; }
function holeFolien(cb) {
  const https = require("https");
  const req = https.get(FOLIEN_URL + "?t=" + Date.now(), { headers: { "Cache-Control": "no-cache" } }, res => {
    if (res.statusCode !== 200) { res.resume(); return cb && cb(false); }
    const chunks = []; res.on("data", c => chunks.push(c));
    res.on("end", () => {
      try {
        const buf = Buffer.concat(chunks); if (buf.length < 10000) return cb && cb(false);
        const m = buf.toString("utf8", 0, 200000).match(/const DATE = "(\d{4}-\d{2}-\d{2})"/);
        const f = path.join(autoDir(), "Atelier_Folien_" + (m ? m[1] : "aktuell") + ".html");
        let same = false; try { same = fs.existsSync(f) && fs.readFileSync(f).equals(buf); } catch (e) {}
        if (!same) { fs.writeFileSync(f, buf); try { for (const n of fs.readdirSync(autoDir())) if (n !== path.basename(f)) fs.unlinkSync(path.join(autoDir(), n)); } catch (e) {} }
        cb && cb(!same, f);
      } catch (e) { cb && cb(false); }
    });
  });
  req.on("error", () => cb && cb(false));
  req.setTimeout(15000, () => { req.destroy(); });
}
function folders() {
  const out = [autoDir()];
  for (const k of ["downloads", "desktop", "documents"]) { try { out.push(app.getPath(k)); } catch (e) {} }
  return out.concat(driveFolders());
}
/* alle Folien-Dateien, neueste zuerst */
function candidates() {
  const list = [];
  for (const d of folders()) {
    let names = [];
    try { names = fs.readdirSync(d); } catch (e) { continue; }
    for (const n of names) {
      if (!PATTERN.test(n)) continue;
      const f = path.join(d, n);
      try { const st = fs.statSync(f); if (st.isFile()) list.push({ path: f, name: n, folder: path.basename(d), mtime: st.mtimeMs }); } catch (e) {}
    }
  }
  return list.sort((a, b) => b.mtime - a.mtime);
}
function newest() { const c = candidates(); return c.length ? c[0] : null; }

function openFile(f, hash) {
  if (!f || !fs.existsSync(f)) { openStart(); return; }
  current = f; told = null;
  win.loadFile(f, hash ? { hash } : undefined);
  win.setTitle("Atelier Folien · " + path.basename(f));
}
function openStart() { current = null; win.loadFile(path.join(__dirname, "start.html")); win.setTitle("Atelier Folien"); }
async function chooseFile() {
  const r = await dialog.showOpenDialog(win, {
    title: "Folien-Datei öffnen",
    defaultPath: app.getPath("downloads"),
    filters: [{ name: "Folien-Datei", extensions: ["html", "htm"] }],
    properties: ["openFile"]
  });
  if (!r.canceled && r.filePaths[0]) openFile(r.filePaths[0]);
}
function loadNewest() { const n = newest(); if (n) openFile(n.path); else openStart(); }
function toggleFull() { win.setFullScreen(!win.isFullScreen()); }

/* Liegt eine neuere Folien-Datei in Downloads, gibt es einen kurzen Hinweis (nie ein Wechsel mitten in der Stunde) */
function watchNewer() {
  if (!win || !current) return;
  const n = newest();
  if (!n || n.path === current || n.path === told) return;
  let cur = 0; try { cur = fs.statSync(current).mtimeMs; } catch (e) {}
  if (n.mtime <= cur) return;
  told = n.path;
  const msg = "Neuere Folien-Datei: " + n.name + ". Strg+N lädt sie.";
  win.webContents.executeJavaScript("typeof toast === 'function' && toast(" + JSON.stringify(msg) + ")").catch(() => {});
}

function menu() {
  const tpl = [
    { label: "Datei", submenu: [
      { label: "Neueste Folien-Datei laden", accelerator: "CmdOrCtrl+N", click: loadNewest },
      { label: "Folien-Datei öffnen …", accelerator: "CmdOrCtrl+O", click: chooseFile },
      { label: "Übersicht", click: openStart },
      { type: "separator" },
      { label: "Neu laden", accelerator: "CmdOrCtrl+R", click: () => win.reload() },
      { type: "separator" },
      { label: "Beenden", role: "quit" }
    ] },
    { label: "Ansicht", submenu: [
      { label: "Vollbild", accelerator: "F11", click: toggleFull },
      { role: "zoomIn", label: "Größer" }, { role: "zoomOut", label: "Kleiner" }, { role: "resetZoom", label: "Normalgröße" }
    ] },
    { label: "Hilfe", submenu: [
      { label: "Nach Updates suchen", click: () => checkUpdates(true) },
      { label: "Version " + app.getVersion(), enabled: false }
    ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* Updates: lädt im Hintergrund, installiert beim Beenden. Nie mitten im Unterricht. */
let updater = null;
function checkUpdates(manual) {
  if (!app.isPackaged) { if (manual) dialog.showMessageBox(win, { message: "Updates gibt es nur in der installierten Fassung." }); return; }
  try {
    if (!updater) {
      updater = require("electron-updater").autoUpdater;
      updater.autoDownload = true;
      updater.autoInstallOnAppQuit = true;
      updater.on("update-downloaded", info => {
        updateReady = true;
        if (win) win.webContents.executeJavaScript("typeof toast === 'function' && toast(" + JSON.stringify("Update " + info.version + " ist bereit und kommt beim nächsten Start.") + ")").catch(() => {});
      });
      updater.on("error", () => {});
    }
    const p = updater.checkForUpdates();
    if (manual && p) p.then(r => {
      const v = r && r.updateInfo && r.updateInfo.version;
      dialog.showMessageBox(win, { message: v && v !== app.getVersion() ? "Update " + v + " wird geladen und beim nächsten Start installiert." : "Atelier Folien ist aktuell (" + app.getVersion() + ")." });
    }).catch(() => { dialog.showMessageBox(win, { message: "Gerade keine Verbindung zum Update-Server." }); });
  } catch (e) {}
}

/* Einmal beim Start: Rechte (Dokumentenkamera, Vollbild), Updates der Folien-Datei */
function setupOnce() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    if (perm === "fullscreen") return cb(true);
    if (perm === "media") return cb(!(details && details.mediaTypes && details.mediaTypes.includes("audio")));
    cb(false);
  });
  ses.setPermissionCheckHandler((wc, perm) => perm === "media" || perm === "fullscreen");
  setInterval(watchNewer, 60000);
  setInterval(() => holeFolien((neu, f) => { if (neu && f && !current) openFile(f); else if (neu) watchNewer(); }), 3600 * 1000);
}

/* Fenster: "normal" (Startseite, PDF-Folien) oder "ebene" (durchsichtig über der laufenden PowerPoint-Präsentation:
   Uhr, Timer, Schwarzbild, Kamera, Klassenlisten liegen darüber, die Folie zeigt PowerPoint) */
let mode = "normal";
function makeWindow(m) {
  mode = m;
  const wp = { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false, spellcheck: false, backgroundThrottling: false };
  if (m === "ebene") {
    const b = screen.getPrimaryDisplay().bounds;
    win = new BrowserWindow({ x: b.x, y: b.y, width: b.width, height: b.height, show: false, frame: false, transparent: true,
      backgroundColor: "#00000000", hasShadow: false, resizable: false, movable: false, minimizable: true, maximizable: false,
      alwaysOnTop: true, icon: path.join(__dirname, "icon.png"), webPreferences: wp });
    win.setAlwaysOnTop(true, "screen-saver");
    win.setIgnoreMouseEvents(true, { forward: true });
    win.once("ready-to-show", () => win.show());
  } else {
    win = new BrowserWindow({ width: 1400, height: 900, show: false, backgroundColor: "#0b0c10", autoHideMenuBar: true,
      icon: path.join(__dirname, "icon.png"), webPreferences: wp });
    win.maximize(); win.show();
  }
  win.on("page-title-updated", e => e.preventDefault());

  /* Links ins Netz im normalen Browser öffnen */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (/^https?:/i.test(url)) { e.preventDefault(); shell.openExternal(url); } });

  /* F11 auch dann, wenn das Menü ausgeblendet ist */
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11" && mode === "normal") { e.preventDefault(); toggleFull(); }
    else if (input.control && !input.shift && (input.key === "n" || input.key === "N") && mode === "normal") { e.preventDefault(); loadNewest(); }
    else if (input.control && !input.shift && (input.key === "o" || input.key === "O") && mode === "normal") { e.preventDefault(); chooseFile(); }
  });

  /* nur für die automatische Probe nach dem Bau */
  if (process.env.ATELIER_PROBE) win.webContents.on("did-finish-load", () => {
    try { fs.writeFileSync(process.env.ATELIER_PROBE, JSON.stringify({ current, url: win.webContents.getURL(), title: win.getTitle(), version: app.getVersion() })); } catch (e) {}
  });
  win.on("focus", watchNewer);
}
/* Wechsel zwischen normalem Fenster und Ebene; die Folien-Datei behält ihren Stand (gespeichert im Browser-Speicher) */
function swap(m, hash) {
  const old = win, f = current;
  makeWindow(m);
  if (f) openFile(f, hash); else openStart();
  if (old && !old.isDestroyed()) old.destroy();
}

function createWindow() {
  setupOnce();
  makeWindow("normal");
  /* Folien-Datei als Startparameter (z. B. Doppelklick oder Probe) */
  const arg = process.argv.slice(1).find(a => /\.html?$/i.test(a) && fs.existsSync(a));
  if (arg) openFile(arg); else loadNewest();
  if (!arg) holeFolien((neu, f) => { if (neu && f && (!current || !/^Atelier_Folien_\d{4}-\d{2}-\d{2}\.html$/.test(path.basename(current)) || path.basename(f) > path.basename(current))) openFile(f); });
}

ipcMain.handle("list", () => candidates().slice(0, 12).map(c => ({ path: c.path, name: c.name, folder: c.folder, mtime: c.mtime })));
ipcMain.handle("open", () => chooseFile());
ipcMain.handle("openPath", (e, p) => { if (typeof p === "string" && PATTERN.test(path.basename(p)) && candidates().some(c => c.path === p)) openFile(p); });
/* Notizen aus Pult (kommen verschlüsselt über die Folien-Datei): als Markdown in Drive ablegen,
   damit Claude sie bei der Planung lesen kann. Ohne Drive für Desktop: Dokumente\Atelier Folien. */
const nz = v => (typeof v === "string" ? v : "").slice(0, 4000).replace(/\r/g, "");
function notizZiel(){
  for (const d of driveFolders()){
    const root = path.dirname(d);   /* ...\Schule_Material */
    try { const z = path.join(root, "Tagesmemos_2026-27"); fs.mkdirSync(z, { recursive: true }); return { file: path.join(z, "Pult_Notizen.md"), wo: "Drive, Tagesmemos_2026-27" }; } catch (e) {}
  }
  const z = path.join(app.getPath("documents"), "Atelier Folien");
  fs.mkdirSync(z, { recursive: true });
  return { file: path.join(z, "Pult_Notizen.md"), wo: "Dokumente, Atelier Folien" };
}
function notizMd(list){
  const T = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const rows = list.filter(n => n && /^\d{4}-\d{2}-\d{2}$/.test(n.date) && /^\d{1,2}:\d{2}$/.test(n.lesson))
    .sort((a, b) => (b.date + b.lesson.padStart(5, "0")).localeCompare(a.date + a.lesson.padStart(5, "0")));
  const one = (k, v) => v ? "- **" + k + ":** " + nz(v).replace(/\n+/g, " / ") + "\n" : "";
  let out = "# Pult-Notizen\n\nAutomatisch geschrieben vom Programm Atelier Folien (Notizen aus Pult). Neueste zuerst. Nicht von Hand bearbeiten, wird überschrieben.\n";
  for (const n of rows){
    const d = new Date(n.date + "T12:00:00"), dd = T[d.getDay()] + " " + n.date.slice(8, 10) + "." + n.date.slice(5, 7) + "." + n.date.slice(0, 4);
    out += "\n## " + dd + ", " + n.lesson.replace(":", ".") + ", " + nz(n.klasse) + (n.titel ? ": " + nz(n.titel) : "") + "\n\n"
      + one("Zeit gehalten", n.zeit) + one("Ziel erreicht", n.ziel) + one("Notiz", n.text) + one("Aus den Exit-Tickets", n.exit) + one("Fürs Material ändern", n.aendern);
  }
  return out;
}
ipcMain.handle("notizen", (e, list) => {
  try {
    if (!Array.isArray(list) || list.length > 2000) return { ok: false };
    const z = notizZiel();
    fs.writeFileSync(z.file, notizMd(list), "utf8");
    return { ok: true, wo: z.wo };
  } catch (err) { return { ok: false }; }
});
/* Wo die Dateien der Stunden liegen (Josef, 01.11.2026): 00_Schule_heute (Klasse\\heute), dann die Klassenordner
   in Schule_Material, dann 00_dateien_für_den_schultag, dann Downloads, Desktop, Dokumente */
function suchOrdner() {
  const dirs = heuteFolders();
  for (const d of driveFolders()) {
    const root = path.dirname(d);
    try { for (const n of fs.readdirSync(root)) { const f = path.join(root, n); if (!/^(00_|_alt|Tagesmemos)/i.test(n) && !/_alt/i.test(n) && fs.statSync(f).isDirectory()) dirs.push(f); } } catch (err) {}
  }
  for (const d of driveFolders()) if (!dirs.includes(d)) dirs.push(d);
  for (const d of folders()) if (!dirs.includes(d)) dirs.push(d);
  return dirs;
}
/* neueste passende Datei im ersten Ordner, der eine hat */
function finde(muster, endung, max) {
  const re = new RegExp(String(muster).slice(0, 200), "i");
  for (const d of suchOrdner()) {
    let names = [], best = null; try { names = fs.readdirSync(d); } catch (err) { continue; }
    for (const n of names) if (endung.test(n) && re.test(n) && !/^~\$/.test(n) && !/backup/i.test(n)) {
      const f = path.join(d, n); let st; try { st = fs.statSync(f); } catch (err) { continue; }
      if (st.isFile() && st.size < max && (!best || st.mtimeMs > best.mtime)) best = { path: f, name: n, mtime: st.mtimeMs };
    }
    if (best) return best;
  }
  return null;
}
/* PDFs der Stunden (Rückfall, Übersicht, Folienbild fürs Handy) */
ipcMain.handle("pdf", (e, muster) => {
  try {
    const best = finde(muster, /\.pdf$/i, 60 * 1024 * 1024);
    if (!best) return null;
    return { name: best.name, b64: fs.readFileSync(best.path).toString("base64") };
  } catch (err) { return null; }
});

/* ===== PowerPoint (Josef, 01.11.2026): die Stunde läuft als .pptx in PowerPoint, das Programm steuert sie.
   Ein PowerShell-Helfer spricht PowerPoint über COM an (nur lesen, schreibgeschützt geöffnet). ===== */
let pps = null, ppsBuf = "", ppsId = 0, ppsWait = new Map(), ppsKette = Promise.resolve(), pptZiel = null;
const pptGefunden = new Set();
function ppsStart() {
  if (pps) return pps;
  const ziel = path.join(app.getPath("userData"), "ppt.ps1");
  try { fs.writeFileSync(ziel, "\ufeff" + fs.readFileSync(path.join(__dirname, "ppt.ps1"), "utf8"), "utf8"); } catch (e) {}
  pps = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ziel], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  pps.stdout.setEncoding("utf8");
  pps.stdout.on("data", d => {
    ppsBuf += d; let i;
    while ((i = ppsBuf.indexOf("\n")) >= 0) {
      const z = ppsBuf.slice(0, i).trim(); ppsBuf = ppsBuf.slice(i + 1);
      if (!z) continue;
      try { const o = JSON.parse(z); const w = ppsWait.get(o.id); if (w) { ppsWait.delete(o.id); w(o); } } catch (e) {}
    }
  });
  pps.stderr.on("data", () => {});
  pps.on("exit", () => { pps = null; for (const w of ppsWait.values()) w({ ok: false, fehler: "Helfer beendet" }); ppsWait.clear(); });
  return pps;
}
function ppsRuf(obj, ms) {
  const lauf = () => new Promise(res => {
    if (process.platform !== "win32") return res({ ok: false, fehler: "nur unter Windows" });
    let p; try { p = ppsStart(); } catch (e) { return res({ ok: false, fehler: "PowerShell fehlt" }); }
    const id = ++ppsId;
    const t = setTimeout(() => { if (ppsWait.has(id)) { ppsWait.delete(id); res({ ok: false, fehler: "keine Antwort von PowerPoint" }); } }, ms || 8000);
    ppsWait.set(id, o => { clearTimeout(t); res(o); });
    try { p.stdin.write(JSON.stringify(Object.assign({ id }, obj)) + "\n"); } catch (e) { ppsWait.delete(id); clearTimeout(t); res({ ok: false, fehler: "Helfer nicht erreichbar" }); }
  });
  const r = ppsKette.then(lauf, lauf);
  ppsKette = r.catch(() => {});
  return r;
}
/* Ebene über die Präsentation legen und nach vorn holen */
function ebeneNachVorn(r) {
  if (!win || win.isDestroyed() || mode !== "ebene") return;
  try {
    if (r && r.breite > 0) {
      const d = screen.getDisplayNearestPoint({ x: Math.round(r.links * 4 / 3 + 20), y: Math.round(r.oben * 4 / 3 + 20) });
      win.setBounds(d.bounds);
    }
  } catch (e) {}
  win.setAlwaysOnTop(true, "screen-saver"); win.moveTop(); win.focus(); win.webContents.focus();
  setTimeout(() => { if (win && !win.isDestroyed() && mode === "ebene" && !win.isFocused()) { win.minimize(); win.restore(); win.setAlwaysOnTop(true, "screen-saver"); win.focus(); } }, 600);
}
ipcMain.handle("pptFind", (e, muster) => {
  try { const b = finde(muster, /\.pptx?$/i, 400 * 1024 * 1024); if (!b) return null; pptGefunden.add(b.path); return { name: b.name, path: b.path }; } catch (err) { return null; }
});
ipcMain.handle("pptStart", (e, o) => {
  if (!o || !pptGefunden.has(o.path) || !/^[\w-]{1,40}$/.test(String(o.id))) return false;
  pptZiel = { id: String(o.id), path: o.path, name: path.basename(o.path) };
  swap("ebene", "ppt=" + encodeURIComponent(pptZiel.id));
  return true;
});
ipcMain.handle("pptOpen", async () => {
  if (!pptZiel) return { ok: false, fehler: "keine Präsentation gewählt" };
  const r = await ppsRuf({ cmd: "open", path: pptZiel.path }, 90000);
  if (r && r.ok) { r.name = pptZiel.name; r.id = pptZiel.id; }
  return r;
});
ipcMain.handle("ppt", async (e, cmd, folie) => {
  if (!["show", "goto", "next", "prev", "state"].includes(cmd)) return { ok: false };
  const r = await ppsRuf({ cmd, folie: Math.max(1, Math.min(999, parseInt(folie, 10) || 1)) }, cmd === "show" ? 30000 : 6000);
  if (cmd === "show") setTimeout(() => ebeneNachVorn(r), 300);
  return r;
});
ipcMain.handle("pptEnd", async (e, pdfStatt) => {
  await ppsRuf({ cmd: "end" }, 15000);
  pptZiel = null;
  if (mode === "ebene") swap("normal", pdfStatt ? "pdf=" + encodeURIComponent(String(pdfStatt).slice(0, 40)) : "");
  return true;
});
ipcMain.handle("maus", (e, durch) => { if (win && !win.isDestroyed() && mode === "ebene") win.setIgnoreMouseEvents(!!durch, { forward: true }); });
ipcMain.handle("info", () => ({ version: app.getVersion(), downloads: app.getPath("downloads"), updateReady }));

app.whenReady().then(() => {
  menu();
  createWindow();
  setTimeout(() => checkUpdates(false), 8000);
  setInterval(() => checkUpdates(false), 4 * 3600 * 1000);
});
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => { try { if (pps) { pps.stdin.write(JSON.stringify({ id: 0, cmd: "end" }) + "\n"); setTimeout(() => { try { pps.kill(); } catch (e) {} }, 1500); } } catch (e) {} });
