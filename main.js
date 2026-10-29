/* Atelier Folien für Windows: öffnet die neueste Folien-Datei (Atelier_Folien_*.html) aus Downloads,
   gibt die Dokumentenkamera frei und aktualisiert sich selbst über GitHub. Keine Daten verlassen das Notebook,
   außer der Kopplung mit Pult, die die Folien-Datei selbst aufbaut. */
const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } = require("electron");
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
function folders() {
  const out = [];
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

function openFile(f) {
  if (!f || !fs.existsSync(f)) { openStart(); return; }
  current = f; told = null;
  win.loadFile(f);
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

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, show: false, backgroundColor: "#0b0c10", autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false, spellcheck: false }
  });
  win.maximize(); win.show();
  win.on("page-title-updated", e => e.preventDefault());

  /* Dokumentenkamera und Vollbild ohne Nachfrage, alles andere aus */
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    if (perm === "fullscreen") return cb(true);
    if (perm === "media") return cb(!(details && details.mediaTypes && details.mediaTypes.includes("audio")));
    cb(false);
  });
  ses.setPermissionCheckHandler((wc, perm) => perm === "media" || perm === "fullscreen");

  /* Links ins Netz im normalen Browser öffnen */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (/^https?:/i.test(url)) { e.preventDefault(); shell.openExternal(url); } });

  /* F11 auch dann, wenn das Menü ausgeblendet ist */
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") { e.preventDefault(); toggleFull(); }
    else if (input.control && !input.shift && (input.key === "n" || input.key === "N")) { e.preventDefault(); loadNewest(); }
    else if (input.control && !input.shift && (input.key === "o" || input.key === "O")) { e.preventDefault(); chooseFile(); }
  });

  /* nur für die automatische Probe nach dem Bau */
  if (process.env.ATELIER_PROBE) win.webContents.on("did-finish-load", () => {
    try { fs.writeFileSync(process.env.ATELIER_PROBE, JSON.stringify({ current, url: win.webContents.getURL(), title: win.getTitle(), version: app.getVersion() })); } catch (e) {}
  });
  win.on("focus", watchNewer);
  setInterval(watchNewer, 60000);
  /* Folien-Datei als Startparameter (z. B. Doppelklick oder Probe) */
  const arg = process.argv.slice(1).find(a => /\.html?$/i.test(a) && fs.existsSync(a));
  if (arg) openFile(arg); else loadNewest();
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
/* PDFs der Stunden aus dem Drive-Schultagsordner (Google Drive für Desktop) oder Downloads lesen, Dateiname nach Muster */
ipcMain.handle("pdf", (e, muster) => {
  try {
    const re = new RegExp(String(muster).slice(0, 200), "i");
    /* Reihenfolge: Schultagsordner (füllt der Morgenlauf), dann die Klassenordner in Schule_Material, dann Downloads, Desktop, Dokumente */
    const dirs = driveFolders().slice();
    for (const d of driveFolders()) {
      const root = path.dirname(d);
      try { for (const n of fs.readdirSync(root)) { const f = path.join(root, n); if (!/^(00_|_alt|Tagesmemos)/i.test(n) && !/_alt/i.test(n) && fs.statSync(f).isDirectory()) dirs.push(f); } } catch (err) {}
    }
    for (const d of folders()) if (!dirs.includes(d)) dirs.push(d);
    let best = null;
    for (const d of dirs) {
      let names = []; try { names = fs.readdirSync(d); } catch (err) { continue; }
      for (const n of names) if (/\.pdf$/i.test(n) && re.test(n)) {
        const f = path.join(d, n); let st; try { st = fs.statSync(f); } catch (err) { continue; }
        if (st.isFile() && st.size < 60 * 1024 * 1024 && (!best || st.mtimeMs > best.mtime)) best = { path: f, name: n, mtime: st.mtimeMs };
      }
      if (best) break;   /* Drive zuerst, dann Downloads, Desktop, Dokumente */
    }
    if (!best) return null;
    return { name: best.name, b64: fs.readFileSync(best.path).toString("base64") };
  } catch (err) { return null; }
});
ipcMain.handle("info", () => ({ version: app.getVersion(), downloads: app.getPath("downloads"), updateReady }));

app.whenReady().then(() => {
  menu();
  createWindow();
  setTimeout(() => checkUpdates(false), 8000);
  setInterval(() => checkUpdates(false), 4 * 3600 * 1000);
});
app.on("window-all-closed", () => app.quit());
