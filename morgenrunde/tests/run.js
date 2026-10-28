// Testlauf für die Morgenrunde: lädt die Seite in jsdom mit einer Datenbank-Attrappe
// und spielt komplette Durchgänge durch. Aufruf: node run.js <anzahl> <startseed>
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const HTML = fs.readFileSync(path.join(__dirname, "..", "app", "morgenrunde.html"), "utf8");
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "hefte", "2026-10-29.json"), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- Datenbank-Attrappe nach db.d.ts ---------- */
function makeStore() { return { docs: new Map(), listeners: new Set(), writes: 0, failNext: 0 }; }
function makeDb(store) {
  const matches = (data, filters) => filters.every(([f, op, v]) => {
    const x = data[f];
    switch (op) { case ">=": return x >= v; case "<=": return x <= v; case "==": return x === v; case ">": return x > v; case "<": return x < v; case "!=": return x !== v; default: throw new Error("op " + op); }
  });
  const snapDoc = (id, data) => ({ id, exists: data !== undefined, data: () => (data === undefined ? undefined : Object.freeze(clone(data))), metadata: { fromCache: false, hasPendingWrites: false } });
  const notify = () => { for (const l of store.listeners) setTimeout(() => l.fire(), 0); };
  function checkPath(p, even) { const n = p.split("/").length; if ((n % 2 === 0) !== even) throw new TypeError("parity " + p); if (!/^[A-Za-z0-9_\-.~:@+\/]+$/.test(p)) throw new TypeError("grammar " + p); }
  function query(col, filters) {
    const q = {
      where: (f, op, v) => query(col, filters.concat([[f, op, v]])),
      orderBy: () => q, limit: () => q,
      get: async () => run(),
      onSnapshot(next, err) { const l = { fire: () => { try { next(run()); } catch (e) { store.errors.push("listener: " + e.stack); } } }; store.listeners.add(l); setTimeout(l.fire, 5); return () => store.listeners.delete(l); },
    };
    function run() {
      const docs = [];
      for (const [p, d] of [...store.docs.entries()].sort()) { const parts = p.split("/"); const c = parts.slice(0, -1).join("/"); if (c === col && matches(d, filters)) docs.push(snapDoc(parts[parts.length - 1], d)); }
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    }
    return q;
  }
  return {
    collection(p) { checkPath(p, false); const q = query(p, []); q.path = p; q.doc = (id) => this.doc(p + "/" + id); return q; },
    doc(p) {
      checkPath(p, true);
      return {
        id: p.split("/").pop(), path: p,
        async get() { return snapDoc(p.split("/").pop(), store.docs.get(p)); },
        async set(data) {
          if (data === null || typeof data !== "object" || Array.isArray(data)) throw { code: "invalid_argument", message: "body" };
          const s = JSON.stringify(data); if (s.length > 256 * 1024) throw { code: "invalid_argument", message: "size" };
          if (store.inflight.has(p)) store.errors.push("overlapping write on " + p);
          store.inflight.add(p); await new Promise((r) => setTimeout(r, 2));
          store.inflight.delete(p);
          if (store.failNext > 0) { store.failNext--; throw { code: "unavailable", message: "simulated" }; }
          store.docs.set(p, JSON.parse(s)); store.writes++; notify();
        },
        async update(data) { if (!store.docs.has(p)) throw { code: "invalid_argument" }; store.docs.set(p, Object.assign(store.docs.get(p), clone(data))); notify(); },
        async delete() { store.docs.delete(p); notify(); },
        onSnapshot(next) { const l = { fire: () => next(snapDoc(p.split("/").pop(), store.docs.get(p))) }; store.listeners.add(l); setTimeout(l.fire, 5); return () => store.listeners.delete(l); },
      };
    },
  };
}

/* ---------- Seite öffnen ---------- */
async function open(store, isoNow, opts = {}) {
  store.errors = store.errors || []; store.inflight = store.inflight || new Set();
  const vc = new VirtualConsole();
  const logs = [];
  vc.on("jsdomError", (e) => logs.push("jsdomError: " + (e.stack || e.message)));
  vc.on("error", (e) => logs.push("console.error: " + e));
  vc.on("warn", (e) => logs.push("console.warn: " + e));
  const fixed = new Date(isoNow).getTime();
  const dom = new JSDOM("<!doctype html><html><head><meta charset=utf-8></head><body>" + HTML + "</body></html>", {
    runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc, url: "https://claude.ai/artifact/test",
    beforeParse(w) {
      const RealDate = w.Date;
      class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } }
      w.Date = FakeDate;
      w.scrollTo = () => {};
      w.addEventListener("error", (e) => logs.push("window.error: " + e.message));
      w.addEventListener("unhandledrejection", (e) => logs.push("unhandledrejection: " + (e.reason && (e.reason.stack || e.reason.message || JSON.stringify(e.reason)))));
      if (!opts.noClaude) w.claude = { use: async (n) => (n === "db" ? (opts.nullDb ? null : makeDb(store)) : null) };
    },
  });
  const w = dom.window;
  await waitFor(() => w.MR && w.MR._state && (w.MR._state.ready || w.MR._state.failed), 2000, "boot");
  return { dom, w, d: w.document, logs, S: w.MR._state };
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(fn, ms, label) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return; } catch (e) {} await sleep(5); } throw new Error("Timeout: " + label); }
async function settle(store) { await sleep(20); await waitFor(() => store.inflight.size === 0, 2000, "writes"); await sleep(20); }

/* ---------- Prüfwerkzeuge ---------- */
function assert(c, msg) { if (!c) throw new Error("Assertion: " + msg); }
function click(d, sel) { const el = typeof sel === "string" ? d.querySelector(sel) : sel; assert(el, "Element fehlt: " + sel); assert(!el.disabled, "Element deaktiviert: " + sel); el.click(); }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function text(d) { return d.getElementById("app").textContent; }
function noForbiddenText(d) {
  const t = text(d);
  const m = t.match(/.{0,40}(undefined|NaN|\[object Object\]|\bnull\b).{0,40}/); assert(!m, "Unsauberer Text in der Ansicht: " + (m && m[0]));
  assert(!/[–—]/.test(t), "Langer Gedankenstrich in der Ansicht");
}

/* ---------- Szenarien ---------- */
async function playQuiz(page, store, rand, pctRight, stopAfter) {
  const { d, S, w } = page; let answered = 0; const chosen = {};
  while (S.view === "play") {
    noForbiddenText(d);
    if (S.phase === "review") {
      const r = S.rq[S.ri]; const right = rand() < pctRight;
      const btns = [...d.querySelectorAll(".opt")]; assert(btns.length === r.q.options.length, "Optionen Wiederholung");
      const target = btns.find((b) => (Number(b.dataset.opt) === r.q.correct) === right) || btns[0];
      click(d, target); await sleep(1);
      assert(d.querySelector(".reveal"), "Auflösung Wiederholung fehlt");
      click(d, "#next"); await sleep(1); continue;
    }
    const qs = w.MR.cleanQuestions(S.quizzes[S.date]); const x = qs[S.idx];
    const expectWho = {fach:"Erzähler",methodik:"Kollegin",paedagogik:"Schülerin",didaktik:"Der MB"}[x.area];
    assert(d.querySelector(".who span").textContent === expectWho, "Sprecher " + x.id);
    const btns = [...d.querySelectorAll(".opt")]; assert(btns.length === x.options.length, "Optionenzahl " + x.id);
    const letters = btns.map((b) => b.querySelector(".key").textContent).join(""); assert(letters === "ABCD".slice(0, btns.length), "Buchstaben " + letters);
    const right = rand() < pctRight;
    const target = btns.find((b) => (Number(b.dataset.opt) === x.correct) === right);
    click(d, target); await sleep(1);
    chosen[x.id] = Number(target.dataset.opt);
    const rev = d.querySelector(".reveal"); assert(rev, "Auflösung fehlt " + x.id);
    assert(rev.textContent.includes(right ? "Richtig" : "Knapp daneben"), "Urteil falsch " + x.id);
    assert(d.querySelectorAll(".opt.right").length === 1, "genau eine richtige Markierung");
    assert([...d.querySelectorAll(".opt")].every((b) => b.disabled), "Optionen nach Wahl gesperrt");
    // Doppeltippen darf nichts ändern
    target.click(); await sleep(1);
    answered++;
    if (stopAfter && answered >= stopAfter) return chosen;
    click(d, "#next"); await sleep(1);
  }
  return chosen;
}

async function scenarioFullDay(seed) {
  const store = makeStore(); const rand = rng(seed);
  store.docs.set("quizzes/2026-10-29", clone(QUIZ));
  store.errors = []; store.inflight = new Set();
  const page = await open(store, "2026-10-29T06:35:00+01:00");
  const { d, S, w } = page;
  assert(S.date === "2026-10-29", "Datum gewählt: " + S.date);
  assert(text(d).includes("In diesem Heft"), "Titel zeigt Inhalt");
  noForbiddenText(d);
  click(d, "#start"); await sleep(5);
  assert(S.view === "play" && S.phase === "main", "Start im Hauptteil (keine Wiederholungen fällig)");
  assert(d.querySelector(".chapter").textContent.includes("Weihnachtskarte"), "Kapitel 7a");
  const pct = 0.3 + rand() * 0.6;
  const chosen = await playQuiz(page, store, rand, pct);
  assert(S.view === "boss", "Endgegner erreicht");
  assert(text(d).includes("MB"), "Boss zeigt MB");
  click(d, "#bossReveal"); await sleep(2);
  const pts = [...d.querySelectorAll(".check")]; assert(pts.length === QUIZ.boss.points.length, "Bosspunkte");
  const tick = pts.filter(() => rand() < 0.5);
  for (const p of tick) { click(d, d.querySelector('.check[data-pt="' + p.dataset.pt + '"]')); await sleep(1); }
  const judge = d.querySelector(".judge").textContent; assert(judge === w.MR.bossJudge(tick.length, QUIZ.boss.points.length), "MB-Urteil " + judge);
  assert(d.querySelector(".bossart svg"), "MB-Figur da");
  click(d, "#bossDone"); await sleep(2);
  assert(S.view === "result", "Auswertung");
  await settle(store);
  const res = store.docs.get("results/2026-10-29");
  assert(res && res.finished, "Ergebnis gespeichert");
  const expectRight = QUIZ.questions.filter((q) => chosen[q.id] === q.correct).length;
  assert(res.score === expectRight, "Punkte " + res.score + " statt " + expectRight);
  assert(Object.keys(res.answers).length === 20, "20 Antworten gespeichert");
  assert(res.boss.length === tick.length, "Bossabhaken gespeichert");
  assert(text(d).includes(expectRight + " / 20") || d.querySelector(".big").textContent.replace(/\s/g, "") === expectRight + "/20", "Punktzahl angezeigt");
  const wrongIds = QUIZ.questions.filter((q) => chosen[q.id] !== q.correct).map((q) => q.id);
  for (const id of wrongIds) { const r = store.docs.get("review/2026-10-29_" + id); assert(r && r.due === "2026-10-30" && r.step === 0 && r.done === false, "Wiederholung angelegt " + id); }
  assert([...store.docs.keys()].filter((k) => k.startsWith("review/")).length === wrongIds.length, "keine überzähligen Wiederholungen");
  let c = 0, expPts = 0, maxRun = 0, run = 0;
  for (const q of QUIZ.questions) { const ok = chosen[q.id] === q.correct; if (ok) { expPts += Math.round(10 * (q.level || 1) * (1 + 0.25 * Math.min(c, 4))); c++; run++; maxRun = Math.max(maxRun, run); } else { c = 0; run = 0; } }
  assert(res.points === expPts, "Punkte mit Combo " + res.points + " statt " + expPts);
  assert(res.comboMax === maxRun, "längste Combo " + res.comboMax + " statt " + maxRun);
  const prof = store.docs.get("meta/profile");
  assert(prof && prof.totalPoints === expPts && prof.quizzes === 1 && prof.answers === 20 && prof.right === expectRight, "Profil gezählt: " + JSON.stringify(prof && {t: prof.totalPoints, q: prof.quizzes}));
  assert(prof.badges && prof.badges.erste === "2026-10-29", "Abzeichen Erstes Heft");
  if (expectRight === 20) assert(prof.badges.perfekt, "Abzeichen Fehlerfrei");
  assert(res.counted === true, "Heft als gezählt markiert");
  const expAlbum = QUIZ.questions.filter((q) => q.work && chosen[q.id] === q.correct).map((q) => q.work.slug).sort();
  const gotAlbum = [...store.docs.keys()].filter((k) => k.startsWith("album/")).map((k) => k.slice(6)).sort();
  assert(JSON.stringify(expAlbum) === JSON.stringify(gotAlbum), "Album " + gotAlbum + " statt " + expAlbum);
  assert(d.getElementById("newBadges") && d.getElementById("newBadges").textContent.includes("Erstes Heft"), "Neues Abzeichen angezeigt");
  if (QUIZ.findings.length) assert(text(d).includes("Beim Fragenbauen aufgefallen"), "Fehlerfunde sichtbar");
  noForbiddenText(d);
  // Woche, Archiv, Durchblättern
  click(d, "#toWeek"); await sleep(2); assert(S.view === "week", "Woche"); noForbiddenText(d);
  const dayCells = d.querySelectorAll(".day"); assert(dayCells.length === 5, "5 Tage");
  assert(dayCells[3].textContent.startsWith(String(expectRight)), "Donnerstag zeigt Punkte");
  assert(text(d).includes("Serie"), "Serie");
  assert(S.view === "week" && d.querySelector(".stat.hot b").textContent === "1", "Serie 1");
  w.MR._state.view = "cover"; w.MR._render(); await sleep(1);
  assert(d.querySelector(".rank b").textContent.length > 3, "Rang sichtbar");
  click(d, "#toAlbum"); await sleep(1); assert(d.querySelectorAll(".card:not(.locked)").length === expAlbum.length, "Albumkarten"); noForbiddenText(d);
  w.MR._state.view = "cover"; w.MR._render(); await sleep(1);
  click(d, "#toBadges"); await sleep(1); assert(d.querySelectorAll(".badge").length === 16 && d.querySelectorAll(".badge.on").length >= 1, "Abzeichen-Seite"); noForbiddenText(d);
  w.MR._state.view = "cover"; w.MR._render(); await sleep(1);
  click(d, "#toArchive"); await sleep(1); assert(d.querySelectorAll(".archive button").length === 1, "Archiv 1 Heft"); noForbiddenText(d);
  click(d, '.archive button[data-date="2026-10-29"]'); await sleep(1);
  assert(d.querySelector("#start").textContent === "Heft ansehen", "Fertiges Heft");
  click(d, "#start"); await sleep(1); assert(S.view === "result", "Auswertung erneut");
  click(d, "#review"); await sleep(1);
  for (let i = 0; i < 20; i++) { assert(d.querySelector(".reveal"), "Durchblättern zeigt Auflösung " + i); click(d, "#next"); await sleep(1); }
  assert(S.view === "boss" && d.querySelector("#bossDone").textContent === "Zur Auswertung", "Durchblättern endet beim Boss");
  click(d, "#bossDone"); await sleep(1);
  await settle(store);
  assert(store.docs.get("results/2026-10-29").score === expectRight, "Punkte nach Durchblättern unverändert");
  return { store, page, wrongIds, expectRight };
}

async function scenarioResume(seed) {
  const store = makeStore(); const rand = rng(seed);
  store.docs.set("quizzes/2026-10-29", clone(QUIZ)); store.errors = []; store.inflight = new Set();
  let page = await open(store, "2026-10-29T06:40:00+01:00");
  click(page.d, "#start"); await sleep(2);
  const n = 3 + Math.floor(rand() * 12);
  await playQuiz(page, store, rand, 0.5, n);
  await settle(store); page.dom.window.close();
  page = await open(store, "2026-10-29T06:50:00+01:00");
  const btn = page.d.querySelector("#start"); assert(btn.textContent === "Weiterlesen", "Weiterlesen nach Neuladen");
  assert(page.d.getElementById("app").textContent.includes("Frage " + (n + 1) + " von 20"), "Fortschritt angezeigt");
  click(page.d, "#start"); await sleep(2);
  assert(page.S.idx === n, "Fortsetzung an Frage " + (n + 1) + " statt " + (page.S.idx + 1));
  await playQuiz(page, store, rand, 0.5);
  assert(page.S.view === "boss", "Boss nach Fortsetzung");
  click(page.d, "#bossReveal"); await sleep(1); click(page.d, "#bossDone"); await sleep(1);
  await settle(store);
  assert(Object.keys(store.docs.get("results/2026-10-29").answers).length === 20, "alle 20 nach Fortsetzung");
  return { store };
}

async function scenarioNextDayReviews(seed) {
  const { store, wrongIds } = await scenarioFullDay(seed);
  const rand = rng(seed * 7 + 1);
  const q2 = clone(QUIZ); q2.date = "2026-10-30"; q2.title = "Freitag, 30. Oktober"; q2.questions = q2.questions.map((x) => Object.assign({}, x, { id: x.id + "f" }));
  store.docs.set("quizzes/2026-10-30", q2);
  const page = await open(store, "2026-10-30T06:35:00+01:00");
  const { d, S } = page; const w2 = page.w;
  assert(S.date === "2026-10-30", "Freitag gewählt");
  const due = Math.min(4, wrongIds.length);
  if (due) assert(text(d).includes("Vorher " + due + " Wiederholung"), "Hinweis Wiederholungen");
  click(d, "#start"); await sleep(2);
  if (due) { assert(S.phase === "review" && S.rq.length === due, "Wiederholungsphase " + S.rq.length); }
  const reviewIds = S.rq.map((r) => r.id);
  const beforeStep = {}; reviewIds.forEach((id) => (beforeStep[id] = store.docs.get("review/" + id).step));
  // Wiederholungen beantworten und Ergebnis merken
  const outcome = {};
  while (S.phase === "review") {
    const r = S.rq[S.ri]; const right = rand() < 0.6;
    const btn = [...d.querySelectorAll(".opt")].find((b) => (Number(b.dataset.opt) === r.q.correct) === right);
    click(d, btn); await sleep(1); outcome[r.id] = right; click(d, "#next"); await sleep(1);
  }
  await settle(store);
  for (const id of reviewIds) { const r = store.docs.get("review/" + id);
    if (outcome[id]) assert(r.step === 1 && r.due === "2026-11-04", "richtig: Stufe 1, fällig in 3 Schultagen (" + r.due + ")");
    else assert(r.step === 0 && r.due === "2026-11-02", "falsch: zurück auf Stufe 0, nächster Schultag (" + r.due + ")"); }
  assert(S.phase === "main" && S.idx === 0, "danach Hauptteil ab Frage 1");
  assert(store.docs.get("results/2026-10-30").reviewDone === true, "Wiederholung als erledigt markiert");
  await playQuiz(page, store, rand, 0.7);
  click(d, "#bossReveal"); await sleep(1); click(d, "#bossDone"); await sleep(2);
  await settle(store);
  assert(d.querySelector(".stat.hot b").textContent === "2", "Serie 2 nach zwei Tagen");
  const before = store.docs.get("meta/profile").totalPoints;
  const cand = w2.MR.finaleCandidates(S.quizzes, S.results, "2026-10-30");
  if (cand.length) {
    assert(d.querySelector("#finale"), "Finale-Knopf am Freitag");
    click(d, "#finale"); await sleep(2); assert(S.phase === "finale", "Finale läuft");
    let fpts = 0, allOk = true;
    while (S.phase === "finale") { const f = S.fq[S.fi]; const right = rand() < 0.7; allOk = allOk && right;
      const btn = [...d.querySelectorAll(".opt")].find((b) => (Number(b.dataset.opt) === f.q.correct) === right); click(d, btn); await sleep(1);
      if (right) fpts += 10 * (f.q.level || 1) * 2; click(d, "#next"); await sleep(1); }
    await settle(store);
    assert(S.view === "result" && !d.querySelector("#finale"), "Finale fertig");
    const pr = store.docs.get("meta/profile"); assert(pr.totalPoints === before + fpts, "Finalpunkte " + (pr.totalPoints - before) + " statt " + fpts);
    if (allOk) assert(pr.badges.finale, "Abzeichen Wochensieger");
    assert(store.docs.get("results/2026-10-30").finale.done === true, "Finale gespeichert");
  } else assert(!d.querySelector("#finale"), "kein Finale ohne Fehler");
  // Neuladen: Wiederholungen nicht erneut
  page.dom.window.close();
  const p2 = await open(store, "2026-10-30T07:30:00+01:00");
  assert(p2.d.querySelector("#start").textContent === "Heft ansehen", "Freitag fertig");
  return { store };
}

async function scenarioWeekendAndHoliday() {
  const store = makeStore(); store.errors = []; store.inflight = new Set();
  store.docs.set("quizzes/2026-10-29", clone(QUIZ));
  store.docs.set("quizzes/2026-11-02", { date: "2026-11-02", status: "frei", hook: "Herbstferien. Kein Quiz, keine Fragen.", reason: "Herbstferien Bayern 02.11. bis 06.11.2026" });
  let page = await open(store, "2026-10-31T09:00:00+01:00");
  assert(page.S.date === "2026-11-02", "Samstag: nächstes Heft (frei) gewählt, war " + page.S.date);
  assert(text(page.d).includes("Herbstferien"), "Frei-Heft zeigt Grund");
  assert(!page.d.querySelector("#start"), "kein Startknopf bei frei");
  noForbiddenText(page.d);
  click(page.d, "#toWeek"); await sleep(1);
  const cells = [...page.d.querySelectorAll(".day")].map((c) => c.textContent);
  assert(cells[3].startsWith("•") || cells[3].startsWith("×"), "Donnerstag offen/verpasst: " + cells[3]);
  noForbiddenText(page.d);
  page.dom.window.close();
  page = await open(store, "2026-11-09T06:30:00+01:00");
  assert(page.S.date === "2026-11-02", "ohne neues Heft: letztes Heft (" + page.S.date + ")");
  assert(text(page.d).includes("Aus dem Archiv"), "Archivhinweis");
  return { store };
}

async function scenarioEmptyAndFailures() {
  let store = makeStore(); store.errors = []; store.inflight = new Set();
  let page = await open(store, "2026-10-29T06:30:00+01:00");
  assert(text(page.d).includes("Noch kein Heft da"), "Leerer Zustand"); noForbiddenText(page.d);
  page.dom.window.close();
  page = await open(store, "2026-10-29T06:30:00+01:00", { nullDb: true });
  assert(page.S.failed && text(page.d).includes("nicht verfügbar"), "Speicher fehlt: Hinweis");
  page.dom.window.close();
  page = await open(store, "2026-10-29T06:30:00+01:00", { noClaude: true });
  assert(page.S.failed, "ohne Claude: Hinweis");
  page.dom.window.close();
  // Speichern scheitert einmal: zweiter Versuch muss greifen
  store = makeStore(); store.errors = []; store.inflight = new Set();
  store.docs.set("quizzes/2026-10-29", clone(QUIZ));
  page = await open(store, "2026-10-29T06:30:00+01:00");
  click(page.d, "#start"); await sleep(2);
  store.failNext = 1;
  click(page.d, page.d.querySelector(".opt")); await settle(store); await sleep(1100);
  await settle(store);
  assert(store.docs.get("results/2026-10-29") && Object.keys(store.docs.get("results/2026-10-29").answers).length === 1, "Wiederholversuch nach unavailable");
  // U-Bahn: Netz weg, beide Versuche scheitern, Antwort bleibt vorgemerkt und geht beim Wiederverbinden raus
  click(page.d, "#next"); await sleep(2);
  store.failNext = 2;
  click(page.d, page.d.querySelector(".opt")); await settle(store); await sleep(1200); await settle(store);
  assert(Object.keys(store.docs.get("results/2026-10-29").answers).length === 1, "offline: noch nicht gespeichert");
  assert(page.S.saveError.startsWith("Offline"), "offline: Hinweis sichtbar");
  assert(page.d.getElementById("savestate").textContent.startsWith("Offline"), "offline: Hinweis im Kopf");
  page.w.dispatchEvent(new page.w.Event("online")); await settle(store); await sleep(50); await settle(store);
  assert(Object.keys(store.docs.get("results/2026-10-29").answers).length === 2, "online: nachgeschickt");
  assert(page.S.saveError === "", "online: Hinweis weg");
  return { store };
}

async function scenarioMalformed() {
  const store = makeStore(); store.errors = []; store.inflight = new Set();
  const bad = clone(QUIZ);
  bad.questions.push({ id: "x1", q: "kaputt", options: ["a"], correct: 3 });
  bad.questions.push({ q: "ohne id", options: ["a", "b"], correct: 0 });
  bad.questions.push(null);
  store.docs.set("quizzes/2026-10-29", bad);
  store.docs.set("quizzes/garbage", { foo: 1 });
  store.docs.set("quizzes/2026-10-28", { date: "2026-10-28", status: "ready", questions: [] });
  const bossless = clone(QUIZ); bossless.date = "2026-10-27"; delete bossless.boss; delete bossless.findings; delete bossless.alsoToday; bossless.questions = bossless.questions.slice(0, 3);
  store.docs.set("quizzes/2026-10-27", bossless);
  const page = await open(store, "2026-10-29T06:30:00+01:00");
  assert(Object.keys(page.S.quizzes).length === 2, "ungültige Hefte ignoriert: " + Object.keys(page.S.quizzes));
  assert(page.w.MR.cleanQuestions(page.S.quizzes["2026-10-29"]).length === 20, "kaputte Fragen ausgefiltert");
  const rand = rng(5);
  click(page.d, "#start"); await sleep(1);
  assert(page.d.querySelectorAll(".strip .cell").length === 21, "Fortschrittsleiste 20 + Boss");
  // Heft ohne Boss
  page.S.view = "archive"; page.w.MR._render(); await sleep(1);
  click(page.d, '.archive button[data-date="2026-10-27"]'); await sleep(1);
  click(page.d, "#start"); await sleep(1);
  await playQuiz(page, store, rand, 0.5);
  assert(page.S.view === "result", "ohne Boss direkt Auswertung");
  noForbiddenText(page.d);
  await settle(store);
  assert(store.docs.get("results/2026-10-27").finished, "Archivheft gespeichert");
  return { store };
}

function scenarioLogic() {
  const { JSDOM } = require("jsdom");
  // reine Logik ohne Oberfläche
  const dom = new JSDOM("<!doctype html><body>" + HTML.replace("boot();", "") + "</body>", { runScripts: "dangerously" });
  const MR = dom.window.MR;
  assert(MR.addSchoolDays("2026-10-30", 1) === "2026-11-02", "Fr+1 = Mo");
  assert(MR.addSchoolDays("2026-10-29", 3) === "2026-11-03", "Do+3 = Di");
  assert(MR.addSchoolDays("2026-10-29", 7) === "2026-11-09", "Do+7 = Mo");
  assert(MR.weekStart("2026-11-01") === "2026-10-26", "Wochenstart Sonntag");
  assert(MR.isoWeek("2026-10-29") === 44, "KW 44"); assert(MR.isoWeek("2027-01-01") === 53, "KW 53 2026/27"); assert(MR.isoWeek("2026-01-01") === 1, "KW 1 2026");
  assert(MR.todayStr(new Date("2026-10-28T23:30:00Z")) === "2026-10-29", "Berliner Datum nach Mitternacht");
  assert(MR.todayStr(new Date("2026-03-29T00:30:00Z")) === "2026-03-29", "Sommerzeitwechsel");
  let r = MR.newReview("2026-10-29", QUIZ, QUIZ.questions[0]);
  r = MR.nextReview(r, true, "2026-10-30"); assert(r.step === 1 && r.due === "2026-11-04", "Stufe 1");
  r = MR.nextReview(r, true, "2026-11-04"); assert(r.step === 2 && r.due === "2026-11-13", "Stufe 2: +7 Schultage");
  r = MR.nextReview(r, true, "2026-11-13"); assert(r.done === true, "gelernt");
  r = MR.nextReview(Object.assign({}, r, { done: false, step: 2 }), false, "2026-11-13"); assert(r.step === 0 && r.due === "2026-11-16", "falsch: zurück");
  for (let i = 0; i < 50; i++) { const o = MR.order(4, "s" + i); assert([...o].sort().join("") === "0123", "Permutation"); }
  const qz = { a: { status: "ready" } };
  const quizzes = { "2026-10-26": { status: "ready" }, "2026-10-27": { status: "ready" }, "2026-10-28": { status: "frei" }, "2026-10-29": { status: "ready" } };
  const results = { "2026-10-26": { finished: true }, "2026-10-27": { finished: true } };
  assert(MR.computeStreak(quizzes, results, "2026-10-29") === 2, "Serie über freien Tag, heute noch offen");
  results["2026-10-29"] = { finished: true }; assert(MR.computeStreak(quizzes, results, "2026-10-29") === 3, "Serie 3");
  delete results["2026-10-27"]; assert(MR.computeStreak(quizzes, results, "2026-10-29") === 2, "Lücke mit Schild überbrückt");
  assert(MR.bestStreak(quizzes, { "2026-10-26": { finished: true }, "2026-10-27": { finished: true } }) === 2, "Rekord");
  const qq = { "2026-10-19": { status: "ready" }, "2026-10-20": { status: "ready" }, "2026-10-21": { status: "ready" }, "2026-10-22": { status: "ready" }, "2026-10-23": { status: "ready" } };
  const rr = { "2026-10-19": { finished: true }, "2026-10-21": { finished: true }, "2026-10-22": { finished: true }, "2026-10-23": { finished: true } };
  assert(MR.computeStreak(qq, rr, "2026-10-23") === 4, "Schild fängt einen Tag ab");
  assert(MR.shieldUsedThisWeek(qq, rr, "2026-10-23") === true, "Schild verbraucht");
  delete rr["2026-10-22"]; assert(MR.computeStreak(qq, rr, "2026-10-23") === 2, "zweiter Fehltag derselben Woche bricht (Fr + Mi zählen)");
  rr["2026-10-22"] = { finished: true }; qq["2026-10-16"] = { status: "ready" };
  assert(MR.computeStreak(qq, rr, "2026-10-23") === 4, "Fehltag der Vorwoche mit neuem Schild");
  assert(MR.bestStreak(qq, rr) === 4, "Rekord mit Schild");
  assert(MR.rankOf(0).name === "Frisch im Kollegium" && MR.rankOf(1499).pct === 99 && MR.rankOf(1500).name === "Kopierer-Flüsterer" && MR.rankOf(99999).next === null, "Ränge");
  assert(MR.bossJudge(5, 6) === "Genehmigung in Sicht." && MR.bossJudge(3, 6) === "Solide, mit Auflagen." && MR.bossJudge(0, 6) === "Nachbesuch angekündigt.", "MB-Urteil");
  assert(MR.multiplier(0) === 1 && MR.multiplier(4) === 2 && MR.multiplier(9) === 2, "Multiplikator");
  const prof0 = MR.emptyProfile(); prof0.byArea.paedagogik.total = 100; prof0.quizzes = 1; prof0.mastered = 1;
  const eb = MR.earnedBadges(prof0, 10, 5); ["erste", "paedagogik100", "comeback", "sammler10", "serie5"].forEach((b) => assert(eb.includes(b), "Abzeichen " + b));
  assert(MR.slugify("Théo van Doesburg / Contra-Construction") === "theo-van-doesburg-contra-construction", "slug");
  assert(!MR.validQ({ id: "a", q: "x", options: ["a", 3], correct: 0 }), "nicht-Text-Option abgelehnt");
  dom.window.close();
  return {};
}

/* ---------- Hauptprogramm ---------- */
(async () => {
  const runs = Number(process.argv[2] || 1); const start = Number(process.argv[3] || 1);
  const log = [];
  let clean = 0;
  for (let i = 0; i < runs; i++) {
    const seed = start + i; const t0 = Date.now(); const errs = [];
    const scen = [["Logik", () => scenarioLogic()], ["Ganzer Tag", () => scenarioFullDay(seed)], ["Fortsetzen", () => scenarioResume(seed)],
      ["Folgetag mit Wiederholung", () => scenarioNextDayReviews(seed)], ["Wochenende und Ferien", () => scenarioWeekendAndHoliday()],
      ["Leer und Fehler", () => scenarioEmptyAndFailures()], ["Kaputte Daten", () => scenarioMalformed()]];
    const passed = [];
    for (const [name, fn] of scen) {
      try {
        const out = await fn();
        const store = out && out.store; const pageLogs = out && out.page ? out.page.logs : [];
        if (store && store.errors && store.errors.length) throw new Error(store.errors.join("; "));
        const bad = pageLogs.filter((l) => !/Could not load link|Not implemented: window\.scrollTo/.test(l));
        if (bad.length) throw new Error(bad.join("; "));
        passed.push(name);
      } catch (e) { errs.push(name + ": " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e)); }
    }
    const ok = errs.length === 0; clean = ok ? clean + 1 : 0;
    log.push({ run: i + 1, seed, ok, ms: Date.now() - t0, passed: passed.length, total: scen.length, errors: errs });
    console.log((ok ? "OK  " : "FEHL") + " Durchgang " + (i + 1) + " (Seed " + seed + "): " + passed.length + "/" + scen.length + " Szenarien, " + (Date.now() - t0) + " ms" + (ok ? "" : "\n   " + errs.join("\n   ")));
  }
  fs.writeFileSync(path.join(__dirname, "last_log.json"), JSON.stringify(log, null, 2));
  console.log("Fehlerfreie Durchgänge am Stück zum Schluss: " + clean);
  process.exit(0);
})();
