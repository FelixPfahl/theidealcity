#!/usr/bin/env python3
"""Morning-Show-Audio mit mehreren Stimmen (Inka, Wagner, selten Sigma) und Musikmarken.
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
# Tempo je Stimme (Josef 1.11.2026: schneller, Inka etwas langsamer als Wagner)
SPEEDS = {"inka": float(os.environ.get("SPEED_INKA", "1.15")), "wagner": float(os.environ.get("SPEED_WAGNER", "1.25")), "sigma": float(os.environ.get("SPEED_SIGMA", "1.15"))}
VOICES = {"inka": os.environ.get("EL_VOICE_INKA", "S87WJpstXs0Ge2ukRiXJ"),
          "wagner": os.environ.get("EL_VOICE_WAGNER", "qsEcR8IqZUmxT1rxm9G9"),
          "sigma": os.environ.get("EL_VOICE_SIGMA", "JudZUClAOU1jP3wA2eDG")}
SETTINGS = {"inka": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.35},
            "wagner": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.45},
            "sigma": {"stability": 0.6, "similarity_boost": 0.7, "style": 0.2}}
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
    sm = re.match(r"^\s*(INKA|WAGNER|SIGMA)\s*:\s*(.*)$", line, re.I)
    if sm:
        cur["blocks"].append([sm.group(1).lower(), sm.group(2)])
    else:
        sp = cur["tag"] if cur["tag"] in VOICES else (cur["blocks"][-1][0] if cur["blocks"] and cur["blocks"][-1] else "inka")
        last = cur["blocks"][-1] if cur["blocks"] else None
        if last and last[0] == sp: last[1] += " " + line
        else: cur["blocks"].append([sp, line])
if not chapters: sys.exit("Kein Text")

def tts(speaker, text, idx):
    vid = VOICES[speaker]
    h = hashlib.sha1((vid + MODEL + speaker + text).encode()).hexdigest()[:12]
    mp3 = os.path.join(out, "el_%03d_%s_%s.mp3" % (idx, speaker, h))
    if os.path.exists(mp3) and os.path.getsize(mp3) > 1000: return mp3, 0
    payload = {"text": text, "model_id": MODEL, "voice_settings": SETTINGS[speaker]}
    for attempt in range(3):
        r = subprocess.run(["curl", "-sS", "-m", "300", "-o", mp3, "-w", "%{http_code}", "-X", "POST",
                            "-H", "xi-api-key: " + KEY, "-H", "Content-Type: application/json", "-d", json.dumps(payload),
                            "https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128" % vid],
                           capture_output=True, text=True)
        if r.stdout.strip() == "200" and os.path.getsize(mp3) > 1000: return mp3, len(text)
        time.sleep(3)
    raise RuntimeError("ElevenLabs fehlgeschlagen (%s): %s %s" % (speaker, r.stdout, open(mp3, errors="ignore").read()[:200]))

def to_wav(path, fx=None, speed=1.0):
    wav = tempfile.mktemp(suffix=".wav")
    cmd = [ff, "-y", "-loglevel", "error", "-i", path]
    # jede Stimme einzeln auf gleiche Lautheit (Josef 1.11.2026: Inka, Wagner, Sigma immer gleich laut)
    cmd += ["-af", (fx + "," if fx else "") + ("atempo=%.3f," % speed if abs(speed - 1) > 0.01 else "") + "loudnorm=I=-20:TP=-2:LRA=7"]
    subprocess.run(cmd + ["-ac", "1", "-ar", str(SR), wav], check=True)
    a, _ = sf.read(wav, dtype="float32"); os.remove(wav); return a

t0 = time.time(); pieces = []; meta = []; t = 0.0; chars = 0; idx = 0
def add(a):
    global t
    pieces.append(a); t += len(a) / SR
for ch in chapters:
    if ch["tag"] == "song":
        meta.append({"type": "song", "title": "Musik", "start": round(t, 2)})
        add(np.zeros(int(SR * 1.0), np.float32)); continue
    blocks = [[b[0], clean(b[1])] for b in ch["blocks"] if b and clean(b[1])]
    if not blocks: continue
    speakers = sorted(set(b[0] for b in blocks))
    meta.append({"type": "talk", "voice": "+".join(speakers), "title": ch["title"], "start": round(t, 2),
                 "words": sum(len(b[1].split()) for b in blocks)})
    prev = None
    for sp, text in blocks:
        if prev is not None: add(np.zeros(int(SR * (0.25 if sp != prev else 0.45)), np.float32))
        mp3, n = tts(sp, text, idx); idx += 1; chars += n
        add(to_wav(mp3, SIGMA_FX if sp == "sigma" else None, SPEEDS[sp])); prev = sp
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
    amb = 0.012 * hum + 0.010 * vent + 0.030 * bub + 0.020 * beep
    return amb.astype(np.float32)
if os.environ.get("SHOW_AMBIENCE", "lab") == "lab":
    audio = audio + lab_ambience(len(audio), SR)
wav = os.path.join(out, "show.wav"); sf.write(wav, audio, SR)
mp4 = os.path.join(out, "show.mp4")
subprocess.run([ff, "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", str(SR), "-af", "loudnorm=I=-20:TP=-2:LRA=11",
                "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", mp4], check=True)
os.remove(wav)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4],
                           capture_output=True, text=True).stdout.strip() or t)
if abs(dur - t) > 3: sys.exit("Audiolänge passt nicht: %.1f statt %.1f" % (dur, t))
info = {"duration": round(t, 1), "chapters": meta, "sizeBytes": os.path.getsize(mp4), "renderSeconds": round(time.time() - t0, 1),
        "elevenChars": chars, "songs": sum(1 for m in meta if m["type"] == "song")}
if info["sizeBytes"] > 15 * 1024 * 1024: sys.exit("Datei über 15 MB")
json.dump(info, open(os.path.join(out, "show.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(info, ensure_ascii=False))
