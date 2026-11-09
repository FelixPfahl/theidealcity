#!/usr/bin/env python3
"""Morning-Show-Audio mit mehreren Stimmen (Inka, Wagner, Sigma), Klaengen und Musikmarken.
VERBINDLICHER AUFBAU DES TEXTES: werkzeug/show_struktur.md (Einstieg mit KLANG-Soundscape und Skit zu dritt).
Klaenge: Zeile "KLANG: labor 6" | "KLANG: neon" | "KLANG: summen 2" | "KLANG: stille 1".
Aufruf: show_tts.py <show.txt> <ausgabeordner> <schluesseldatei>
Format show.txt:
  ## [show] Kapitelname        Kapitel mit Sprecherzeilen
  INKA: Text ...              jede Zeile/Absatz mit Sprecher (INKA, WAGNER, SIGMA)
  WAGNER: Text ...
  ## [song]                    Musikstelle (1 s Marke, die App spielt dort den Song)
Kapitel mit [inka] oder [wagner] ohne Sprecherzeilen werden ganz von dieser Stimme gesprochen.
Env: EL_MODEL (eleven_v3), EL_VOICE_INKA, EL_VOICE_WAGNER, EL_VOICE_SIGMA
Ergebnis: show.mp4 (AAC 64k, Sprache leiser normalisiert, damit Songs nicht zu leise wirken) und show.json"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, time
import numpy as np
import soundfile as sf

src, out, keyfile = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
MODEL = os.environ.get("EL_MODEL", "eleven_v3")
LANG = os.environ.get("EL_LANG", "de")  # Sprache der Show (fr fuer franzoesische Shows, Josef 2.11.2026)
# Tempo je Stimme (Josef 1.11.2026: schneller, Inka etwas langsamer als Wagner)
SPEEDS = {"inka": float(os.environ.get("SPEED_INKA", "1.15")), "wagner": float(os.environ.get("SPEED_WAGNER", "1.25")), "sigma": float(os.environ.get("SPEED_SIGMA", "1.15")), "xae": float(os.environ.get("SPEED_XAE", "1.2"))}
VOICES = {"inka": os.environ.get("EL_VOICE_INKA", "S87WJpstXs0Ge2ukRiXJ"),
          "wagner": os.environ.get("EL_VOICE_WAGNER", "qsEcR8IqZUmxT1rxm9G9"),
          "sigma": os.environ.get("EL_VOICE_SIGMA", "JudZUClAOU1jP3wA2eDG"),
          "xae": os.environ.get("EL_VOICE_XAE", "7bAxGs7snwywohl5VytO")}  # X Æ A-13: jung, glatt, ueberheblich (Josef 1.11.2026)
SETTINGS = {"inka": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.35},
            "wagner": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.45},
            "sigma": {"stability": 0.6, "similarity_boost": 0.7, "style": 0.2},
            "xae": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.55}}
XAE_FX = "highpass=f=300,lowpass=f=3400,acompressor=threshold=0.2:ratio=4"  # Telefonstimme
# Stimmungen (Josef 1.11.2026: "die Stimmung der Stimmen an das anpassen, was sie sagen, nur einen Tick, aber spuerbar"; Regel fuer alle Shows).
# Zeile "INKA (warm): ..." | "WAGNER (kalt): ..." | "SIGMA (leise): ...". Nur Nachbearbeitung, der Text und der Cache bleiben gleich.
MOODS = {
    "ruhig":     {"speed": 0.95, "pitch": -0.3, "gain": -1.0, "pause": 0.15},
    "warm":      {"speed": 0.96, "pitch": -0.25, "gain": 0.0},
    "leise":     {"speed": 0.95, "pitch": 0.0, "gain": -4.0, "fx": "lowpass=f=7000", "pause": 0.15},
    "traurig":   {"speed": 0.91, "pitch": -0.6, "gain": -2.0, "fx": "lowpass=f=6500", "pause": 0.35},
    "staunen":   {"speed": 0.94, "pitch": 0.45, "gain": -1.0, "pause": 0.2},
    "froh":      {"speed": 1.05, "pitch": 0.4, "gain": 1.0},
    "aufgeregt": {"speed": 1.08, "pitch": 0.7, "gain": 1.5},
    "spott":     {"speed": 1.03, "pitch": 0.2, "gain": 0.0},
    "kalt":      {"speed": 0.96, "pitch": -0.45, "gain": 0.0, "fx": "aecho=0.8:0.7:45:0.08"},
    "scharf":    {"speed": 1.04, "pitch": -0.2, "gain": 2.0, },
    "pathos":    {"speed": 0.92, "pitch": -0.5, "gain": 0.5, "fx": "aecho=0.8:0.8:80|140:0.1|0.05", "pause": 0.35},
}
MOOD_SCALE = float(os.environ.get("MOOD_SCALE", "0.5"))
BASS_CUT = "highpass=f=190:poles=2,bass=g=-10:f=300:w=0.8"   # Josef 1.11.2026: "Der Bass muss überall stark minimiert werden"
# Regie in Klammern, mehrere mit Komma: Stimmung, "pause 2" (Schweigen davor, Sekunden), "unterbricht" (fällt der vorigen
# Figur ins Wort, die Stimmen überlappen kurz, die vorige wird leiser), "zoegernd" (etwas längere Pause davor).
def parse_tags(raw):
    tg = {"mood": "", "pause": None, "cut": False, "hes": False}
    for x in [y.strip().lower() for y in raw.split(",") if y.strip()]:
        x = x.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue")
        if x in MOODS: tg["mood"] = x
        elif x.startswith("pause"):
            try: tg["pause"] = max(0.3, min(6.0, float((x[5:].strip() or "1.5").replace(",", "."))))
            except ValueError: tg["pause"] = 1.5
        elif x in ("unterbricht", "ins wort", "dazwischen"): tg["cut"] = True
        elif x in ("zoegernd", "zoegert"): tg["hes"] = True
        else: print("unbekannte Regie:", x, file=sys.stderr)
    return tg

SIGMA_FX = "asetrate=44100*1.12,aresample=44100,atempo=0.93,aecho=0.8:0.6:28:0.25,chorus=0.6:0.8:40:0.3:0.25:2,highpass=f=180"
KEY = open(keyfile).read().strip()
SR = 24000
ff = shutil.which("ffmpeg")

def clean(s):
    s = re.sub(r"[*_`#]", "", s)
    s = re.sub(r"\s[–—]\s", ", ", s).replace("–", "-").replace("—", "-")
    return re.sub(r"[ \t]+", " ", s).strip()

# Kapitel und Sprecherbloecke lesen
chapters, cur = [], None
for line in open(src, encoding="utf-8").read().splitlines():
    m = re.match(r"^\s*##\s*\[(\w+)\]\s*(.*?)\s*$", line)
    if m:
        tag = m.group(1).lower()
        cur = {"tag": tag, "title": m.group(2) or tag, "blocks": []}
        chapters.append(cur)
        continue
    if cur is None or not line.strip():
        if cur is not None: cur["blocks"].append(None)  # Absatzgrenze
        continue
    sm = re.match(r"^\s*(INKA|WAGNER|SIGMA|XAE|KLANG)\s*(?:\(\s*([^)]*?)\s*\))?\s*:\s*(.*)$", line, re.I)
    if sm:
        cur["blocks"].append([sm.group(1).lower(), sm.group(3), parse_tags(sm.group(2) or "")])
    else:
        sp = cur["tag"] if cur["tag"] in VOICES else (cur["blocks"][-1][0] if cur["blocks"] and cur["blocks"][-1] else "inka")
        last = cur["blocks"][-1] if cur["blocks"] else None
        if last and last[0] == sp: last[1] += " " + line
        else: cur["blocks"].append([sp, line, {}])
if not chapters: sys.exit("Kein Text")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zahlen import sprich  # Zahlen als Woerter (Josef 1.11.2026)

def tts(speaker, text, idx):
    text = sprich(text) if LANG == "de" else text  # zahlen.py kennt nur Deutsch
    vid = VOICES[speaker]
    h = hashlib.sha1((vid + MODEL + speaker + text).encode()).hexdigest()[:12]
    mp3 = os.path.join(out, "el_%03d_%s_%s.mp3" % (idx, speaker, h))
    if os.path.exists(mp3) and os.path.getsize(mp3) > 1000: return mp3, 0
    import glob  # gleiche Zeile an anderer Stelle schon vertont: wiederverwenden, kostet nichts
    for old in glob.glob(os.path.join(out, "el_*_%s_%s.mp3" % (speaker, h))):
        if os.path.getsize(old) > 1000: shutil.copyfile(old, mp3); return mp3, 0
    payload = {"text": text, "model_id": MODEL, "voice_settings": SETTINGS[speaker]}
    if "flash" in MODEL or "turbo" in MODEL: payload["language_code"] = LANG
    for attempt in range(3):
        r = subprocess.run(["curl", "-sS", "-m", "300", "-o", mp3, "-w", "%{http_code}", "-X", "POST",
                            "-H", "xi-api-key: " + KEY, "-H", "Content-Type: application/json", "-d", json.dumps(payload),
                            "https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128" % vid],
                           capture_output=True, text=True)
        if r.stdout.strip() == "200" and os.path.getsize(mp3) > 1000: return mp3, len(text)
        time.sleep(3)
    raise RuntimeError("ElevenLabs fehlgeschlagen (%s): %s %s" % (speaker, r.stdout, open(mp3, errors="ignore").read()[:200]))

def to_wav(path, fx=None, speed=1.0, mood=""):
    wav = tempfile.mktemp(suffix=".wav")
    cmd = [ff, "-y", "-loglevel", "error", "-i", path]
    md = MOODS.get(mood) or {}
    # Josef 1.11.2026 12:23: "Stimmmanipulationen minimaler". Abweichungen nur zur Hälfte (MOOD_SCALE), Bass überall stark abgesenkt.
    k = MOOD_SCALE
    md = {"speed": 1 + (md.get("speed", 1.0) - 1) * k, "pitch": md.get("pitch", 0) * k, "gain": md.get("gain", 0) * k,
          "fx": md.get("fx"), "pause": md.get("pause", 0)}
    r = 2 ** (md.get("pitch", 0) / 12.0)          # Tonhoehe in Halbtoenen, Tempo bleibt durch atempo erhalten
    chain = [fx] if fx else []
    if abs(r - 1) > 0.001: chain.append("asetrate=44100*%.5f,aresample=44100" % r)
    if md.get("fx"): chain.append(md["fx"])
    chain.append(BASS_CUT)
    sp = speed * md.get("speed", 1.0) / r
    if abs(sp - 1) > 0.01: chain.append("atempo=%.3f" % sp)
    # jede Stimme einzeln auf gleiche Lautheit (Josef 1.11.2026: Inka, Wagner, Sigma immer gleich laut), danach Stimmungs-Lautstaerke
    chain.append("loudnorm=I=-20:TP=-2:LRA=7")
    if md.get("gain"): chain.append("volume=%.1fdB" % md["gain"])
    cmd += ["-af", ",".join(chain)]
    subprocess.run(cmd + ["-ac", "1", "-ar", str(SR), wav], check=True)
    a, _ = sf.read(wav, dtype="float32"); os.remove(wav); return a

# Klaenge (Josef 1.11.2026: kleine Soundscape zum Einstieg). Zeile "KLANG: labor 6" | "KLANG: neon" | "KLANG: summen 2" | "KLANG: stille 1"
def soundscape(spec):
    parts = spec.lower().split(); kind = parts[0] if parts else "labor"
    sec = float(parts[1]) if len(parts) > 1 else {"labor": 6, "neon": 2.6, "summen": 2.0, "stille": 1.0, "gojira": 7, "wind": 5, "kraehen": 4, "zug": 6, "rauschen": 1.5, "stoersender": 2.5}.get(kind, 3)
    n = int(SR * sec); tt = np.arange(n) / SR; rng = np.random.default_rng(len(spec) * 31 + n)
    if kind == "stille": return np.zeros(n, np.float32)
    if kind == "telefon":  # zweimal Klingeln
        a = np.zeros(n)
        for st in (0.2, 1.8):
            m = (tt >= st) & (tt < st + 0.9)
            a[m] = (np.sin(2 * np.pi * 440 * tt[m]) + np.sin(2 * np.pi * 480 * tt[m])) * 0.5 * (np.sin(2 * np.pi * 20 * tt[m]) > 0)
        rms = float(np.sqrt(np.mean(a ** 2))) or 1.0
        return (a * (0.035 / rms)).astype(np.float32)
    if kind == "labor":
        fade = np.minimum(1, tt / (sec * 0.6))
        hum = (0.5 * np.sin(2*np.pi*50*tt) + 0.3 * np.sin(2*np.pi*100*tt) + 0.12 * np.sin(2*np.pi*150*tt)) * fade
        k = int(SR * 0.004); vent = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same") * 2.5 * fade
        bub = np.zeros(n); i = int(SR * 0.6)
        while i < n:
            L = int(SR * rng.uniform(0.03, 0.09))
            if i + L >= n: break
            f = rng.uniform(250, 650); x = np.arange(L) / SR
            bub[i:i+L] += np.sin(2*np.pi*(f + 1100*x)*x) * np.exp(-x*40) * rng.uniform(0.5, 1.0)
            i += int(SR * rng.uniform(0.12, 0.55))
        beep = np.zeros(n)
        for at in (sec * 0.45, sec * 0.8):
            j = int(SR * at); L = int(SR * 0.12)
            if j + L < n: x = np.arange(L) / SR; beep[j:j+L] = np.sin(2*np.pi*1760*x) * np.minimum(1, (L - np.arange(L)) / (SR * 0.02))
        drip = np.zeros(n); j = int(SR * sec * 0.3); L = int(SR * 0.05)
        if j + L < n: x = np.arange(L) / SR; drip[j:j+L] = np.sin(2*np.pi*(1400 - 9000*x)*x) * np.exp(-x*70)
        a = 0.02 * hum + 0.03 * vent + 0.30 * bub + 0.16 * beep + 0.35 * drip
        a *= np.minimum(1, (n - np.arange(n)) / (SR * 0.6)) * 0.6 + 0.4  # leicht abklingen, bleibt unter der Stimme
    elif kind == "neon":
        a = np.zeros(n)
        def buzz(j, L, amp):
            L = min(L, n - j); x = np.arange(L) / SR
            b = sum(np.sin(2*np.pi*100*h*x) / h for h in (1, 2, 3, 5, 7)) + 0.3 * rng.standard_normal(L)
            a[j:j+L] += amp * b * np.minimum(1, np.arange(L) / (SR * 0.004))
            c = int(SR * 0.012); a[j:j+c] += 1.2 * rng.standard_normal(c) * np.exp(-np.arange(c) / (SR * 0.003))
        buzz(int(SR*0.15), int(SR*0.07), 0.5); buzz(int(SR*0.55), int(SR*0.14), 0.55); buzz(int(SR*1.05), n, 0.35)
        a *= np.where(tt > 1.05, np.maximum(0.35, 1 - (tt - 1.05) / 1.2), 1)
        a *= 0.12
    elif kind == "gojira":  # fernes, riesiges Wesen: tiefes Grollen, langsamer Ruf, Erde
        env = np.minimum(1, tt / 1.5) * np.minimum(1, (sec - tt) / 1.5)
        k = int(SR * 0.02); rum = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same") * 4
        f0 = 38 + 6 * np.sin(2 * np.pi * 0.11 * tt); ph = 2 * np.pi * np.cumsum(f0) / SR
        call = np.zeros(n); c0 = int(SR * sec * 0.35); L = min(n - c0, int(SR * min(3.5, sec * 0.5)))
        if L > 0:
            x = np.arange(L) / SR; fc = 70 + 25 * np.sin(np.pi * x / (L / SR)) ** 2
            pc = 2 * np.pi * np.cumsum(fc) / SR
            call[c0:c0 + L] = (np.sin(pc) + 0.5 * np.sin(2 * pc) + 0.25 * np.sin(3.01 * pc)) * np.sin(np.pi * x / (L / SR)) ** 1.5
        a = env * (0.6 * rum + 0.5 * np.sin(ph)) + 0.9 * call
        a = np.convolve(a, np.ones(40) / 40, mode="same")
    elif kind == "wind":
        k = int(SR * 0.003); w = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
        g = 0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * tt + 1) * np.sin(2 * np.pi * 0.05 * tt)
        a = w * g * np.minimum(1, np.minimum(tt, sec - tt) / 1.0)
    elif kind == "kraehen":
        a = np.zeros(n); i = int(SR * 0.3)
        while i < n:
            L = int(SR * rng.uniform(0.22, 0.38))
            if i + L >= n: break
            x = np.arange(L) / SR; f = rng.uniform(520, 760) * (1 - 0.25 * x / (L / SR))
            ph = 2 * np.pi * np.cumsum(f) / SR
            tone = sum(np.sin(h * ph) / h for h in (1, 2, 3, 4, 5)) + 0.8 * rng.standard_normal(L)
            tone = np.convolve(tone, np.ones(3) / 3, mode="same")
            a[i:i + L] += tone * np.sin(np.pi * x / (L / SR)) ** 0.6 * rng.uniform(0.4, 1.0)
            i += L + int(SR * rng.uniform(0.15, 0.9))
        k = int(SR * 0.004); a += 0.08 * np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
    elif kind == "zug":  # gleichmaessiges Schienenrattern, leises Rauschen
        k = int(SR * 0.006); hiss = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
        clk = np.zeros(n); beat = 0.0
        while True:
            for off in (0.0, 0.11):
                j = int(SR * (beat + off)); L = int(SR * 0.05)
                if j + L >= n: break
                x = np.arange(L) / SR; clk[j:j + L] += np.sin(2 * np.pi * 90 * x) * np.exp(-x * 60) + 0.3 * rng.standard_normal(L) * np.exp(-x * 90)
            beat += 0.85
            if int(SR * beat) >= n: break
        a = 0.5 * hiss + clk
        a *= np.minimum(1, np.minimum(tt, sec - tt) / 1.0)
    elif kind == "rauschen":  # Raster FM (Josef 1.11.2026): kurzes Funkrauschen zwischen Kapiteln, wie ein Sendersuchlauf
        k = int(SR * 0.0008); hiss = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
        sweep = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.sin(2 * np.pi * 0.7 * tt)) / SR) * 0.25 * (np.sin(2 * np.pi * 1.3 * tt) > 0.6)
        a = (hiss + sweep) * np.minimum(1, np.minimum(tt, sec - tt) / 0.15)
    elif kind == "stoersender":  # Nil-Stoersender: pulsierender Ton mit Rauschen
        k = int(SR * 0.0008); hiss = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
        tone = np.sign(np.sin(2 * np.pi * 620 * tt)) * (np.sin(2 * np.pi * 6 * tt) > 0)
        a = (0.6 * tone + 0.8 * hiss) * np.minimum(1, np.minimum(tt, sec - tt) / 0.1)
        a = np.convolve(a, np.ones(4) / 4, mode="same")
    else:  # summen: Sigma, wie eine Fliege am Glas
        f = 210 + 25 * np.sin(2*np.pi*7*tt) + 15 * rng.standard_normal(n).cumsum() / np.sqrt(n)
        ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2*np.pi)) % 1) - 1
        env = 0.5 + 0.5 * np.abs(np.sin(2*np.pi*0.9*tt + 0.5)); env *= np.minimum(1, np.minimum(tt, sec - tt) / 0.25)
        a = 0.05 * saw * env
        a = np.convolve(a, np.ones(6) / 6, mode="same")
    a = np.clip(a, -0.95, 0.95)
    rms = float(np.sqrt(np.mean(a ** 2))) or 1.0
    target = {"labor": 0.045, "neon": 0.05, "summen": 0.03, "gojira": 0.06, "wind": 0.035, "kraehen": 0.035, "zug": 0.04, "rauschen": 0.03, "stoersender": 0.035}.get(kind, 0.04)
    return (a * (target / rms)).astype(np.float32)

# Raster-FM-Teppich (Josef 9.11.2026, "eigener Teppich im Sprachtrack"): Unter dem letzten Satz vor jedem Song liegt ein
# leiser, fest eingemischter Klangteppich. Spotify startet erst an der Songstelle und blendet dort ein; Inka bleibt so
# immer gleich laut (das Absenken von Spotify unter Inka ging auf Josefs Handy physikalisch nicht ohne Inka leiser zu machen).
BED_ON = os.environ.get("SHOW_BED", "0") == "1"  # 9.11.2026: aus, seit die Sprachspur einen eigenen Kanal hat und Spotify echt unter der Moderation läuft
bed_regions = []; last_line_t = None; prev_type = None
def raster_bed(n, seed=11):
    tt = np.arange(n) / SR; rng = np.random.default_rng(seed)
    a = np.zeros(n)
    for f, g in ((146.83, 0.9), (220.0, 0.7), (261.63, 0.55), (329.63, 0.5), (440.0, 0.25), (493.88, 0.18)):
        det = 1 + 0.0025 * np.sin(2 * np.pi * rng.uniform(0.05, 0.12) * tt + rng.uniform(0, 6))
        ph = 2 * np.pi * np.cumsum(f * det) / SR
        a += g * (np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph))
    a *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.23 * tt)            # langsames Atmen
    k = int(SR * 0.002); hiss = np.convolve(rng.standard_normal(n), np.ones(k) / k, mode="same")
    a += 0.35 * hiss * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt))   # leises Funkrauschen
    rms = float(np.sqrt(np.mean(a ** 2))) or 1.0
    a = a * (float(os.environ.get("SHOW_BED_RMS", "0.03")) / rms)
    fi = min(n, int(SR * 1.6)); fo = min(n, int(SR * 1.2))
    env = np.ones(n); env[:fi] = np.linspace(0, 1, fi) ** 2; env[n - fo:] *= np.linspace(1, 0, fo)
    return (a * env).astype(np.float32)

t0 = time.time(); pieces = []; meta = []; lines = []; t = 0.0; chars = 0; idx = 0
def add(a):
    global t
    pieces.append(a); t += len(a) / SR
for ch in chapters:
    if ch["tag"] == "song":
        if BED_ON and prev_type == "talk" and last_line_t is not None:
            st = max(last_line_t - 0.3, t - 12.0); st = min(st, t - 3.0)
            bed_regions.append((max(0, int(st * SR)), int(t * SR)))
        prev_type = "song"
        meta.append({"type": "song", "title": "Musik", "start": round(t, 2)})
        add(np.zeros(int(SR * 1.0), np.float32)); continue
    blocks = [[b[0], clean(b[1]) if b[0] != "klang" else b[1].strip(), b[2] if len(b) > 2 and b[2] else parse_tags("")] for b in ch["blocks"] if b and b[1].strip()]
    if not blocks: continue
    prev_type = "talk"; last_line_t = None
    speakers = sorted(set(b[0] for b in blocks if b[0] != "klang"))
    meta.append({"type": "talk", "voice": "+".join(speakers), "title": ch["title"], "start": round(t, 2),
                 "words": sum(len(b[1].split()) for b in blocks)})
    prev = None
    prev_text = ""
    for sp, text, tg in blocks:
        if sp == "klang":
            add(soundscape(text)); prev = None; prev_text = ""; continue
        mood = tg["mood"]
        # organischer Rhythmus (Josef 1.11.2026): Lücken leicht schwankend, je nach Satzende, reproduzierbar je Text
        rnd = np.random.default_rng(int(hashlib.sha1(text.encode()).hexdigest()[:8], 16))
        mp3, n = tts(sp, text, idx); idx += 1; chars += n
        jitter = 1.0 + rnd.uniform(-0.015, 0.015)   # winzige Tempo-Schwankung je Zeile
        clip = to_wav(mp3, SIGMA_FX if sp == "sigma" else (XAE_FX if sp == "xae" else None), SPEEDS[sp] * jitter, mood)
        if prev is not None and tg["cut"] and pieces and len(pieces[-1]) > SR:
            # ins Wort fallen: Überlappung 0,5 bis 0,9 s, die vorige Stimme wird dabei auf etwa ein Drittel abgesenkt
            ov = min(int(SR * rnd.uniform(0.5, 0.9)), len(pieces[-1]) // 3, len(clip) // 3)
            last = pieces[-1].copy(); fade = np.linspace(1.0, 0.3, ov).astype(np.float32)
            last[-ov:] = last[-ov:] * fade + clip[:ov]
            lines.append({"t": round(t - ov / SR, 2), "sp": sp, "x": text}); last_line_t = t - ov / SR
            pieces[-1] = last; add(clip[ov:]); prev = sp; prev_text = text; continue
        if prev is not None:
            gap = 0.25 if sp != prev else 0.45
            if prev_text.rstrip().endswith("?"): gap -= 0.08              # Antwort kommt schneller
            elif prev_text.rstrip().endswith(("…", "...")): gap += 0.3     # Satz verklingt
            gap += rnd.uniform(-0.07, 0.12) + MOODS.get(mood, {}).get("pause", 0)
            if tg["hes"]: gap += rnd.uniform(0.5, 0.9)
            if tg["pause"]: gap = tg["pause"]                                # betroffenes Schweigen
            add(np.zeros(int(SR * max(0.08, gap)), np.float32))
        lines.append({"t": round(t, 2), "sp": sp, "x": text}); last_line_t = t; add(clip); prev = sp; prev_text = text
    add(np.zeros(int(SR * 0.9), np.float32))

audio = np.concatenate(pieces)

def lab_ambience(n, sr, seed=7):
    """Wagners Labor (Josef 1.11.2026): Brummen, Lueftung, Blubbern, seltene Pieptoene. Leise unter der Sprache."""
    rng = np.random.default_rng(seed); tt = np.arange(n) / sr
    hum = 0.5 * np.sin(2 * np.pi * 50 * tt) + 0.25 * np.sin(2 * np.pi * 100 * tt) + 0.1 * np.sin(2 * np.pi * 150 * tt)
    noise = rng.standard_normal(n); k = int(sr * 0.004); vent = np.convolve(noise, np.ones(k) / k, mode="same") * 3.0
    bub = np.zeros(n); i = 0
    while i < n:
        i += int(sr * rng.uniform(0.25, 1.3)); L = int(sr * rng.uniform(0.03, 0.08))
        if i + L >= n: break
        f = rng.uniform(250, 700); x = np.arange(L) / sr
        bub[i:i + L] += np.sin(2 * np.pi * (f + 900 * x) * x) * np.exp(-x * 45) * rng.uniform(0.4, 1.0)
    beep = np.zeros(n); i = int(sr * rng.uniform(8, 20))
    while i < n:
        L = int(sr * 0.11)
        if i + L >= n: break
        x = np.arange(L) / sr; beep[i:i + L] += 0.6 * np.sin(2 * np.pi * 1760 * x) * np.minimum(1, (L - np.arange(L)) / (sr * 0.02))
        i += int(sr * rng.uniform(18, 40))
    amb = 0.003 * hum + 0.006 * vent + 0.030 * bub + 0.020 * beep
    return amb.astype(np.float32)
if os.environ.get("SHOW_AMBIENCE", "lab") == "lab":
    audio = audio + lab_ambience(len(audio), SR)
for i, (a0, a1) in enumerate(bed_regions):
    a1 = min(a1, len(audio))
    if a1 - a0 > SR: audio[a0:a1] += raster_bed(a1 - a0, seed=11 + i)
wav = os.path.join(out, "show.wav"); sf.write(wav, audio, SR)
mp4 = os.path.join(out, "show.mp4")
subprocess.run([ff, "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", str(SR), "-af", "highpass=f=170:poles=2,bass=g=-8:f=260:w=0.8,loudnorm=I=-20:TP=-2:LRA=11",
                "-c:a", "aac", "-b:a", os.environ.get("SHOW_BITRATE", "64k"), "-movflags", "+faststart", mp4], check=True)
os.remove(wav)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4],
                           capture_output=True, text=True).stdout.strip() or t)
if abs(dur - t) > 3: sys.exit("Audiolänge passt nicht: %.1f statt %.1f" % (dur, t))
try:
    from kontingent import abfragen
    _q = abfragen(KEY) if KEY else None
except Exception:
    _q = None
info = {"duration": round(t, 1), "chapters": meta, "lines": lines, "quota": _q, "sizeBytes": os.path.getsize(mp4), "renderSeconds": round(time.time() - t0, 1),
        "elevenChars": chars, "songs": sum(1 for m in meta if m["type"] == "song")}
if info["sizeBytes"] > int(os.environ.get("SHOW_MAXMB", "15")) * 1024 * 1024: sys.exit("Datei zu groß")
json.dump(info, open(os.path.join(out, "show.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(info, ensure_ascii=False))
