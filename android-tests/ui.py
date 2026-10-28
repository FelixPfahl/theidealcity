"""Kleines Bedien-Werkzeug für den Emulator (über uiautomator).
python3 android-tests/ui.py tap "Text" | tapclass KLASSE | has "a|b" | texts"""
import html, re, subprocess, sys, time

def adb(*a):
    return subprocess.run(["adb", *a], capture_output=True, text=True, timeout=90).stdout

def dump():
    for _ in range(4):
        adb("shell", "uiautomator", "dump", "/sdcard/u.xml")
        x = adb("exec-out", "cat", "/sdcard/u.xml")
        if "<hierarchy" in x:
            return x
        time.sleep(1.5)
    return ""

def nodes(x):
    for m in re.finditer(r"<node ([^>]*?)/?>", x):
        a = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
        yield {k: html.unescape(v) for k, v in a.items()}

def center(n):
    b = list(map(int, re.findall(r"-?\d+", n.get("bounds", ""))))
    if len(b) == 4 and b[2] > b[0] and b[3] > b[1]:
        return ((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
    return None

def find(label=None, cls=None):
    x = dump()
    exact, part = None, None
    for n in nodes(x):
        if cls:
            if cls in n.get("class", "") and center(n):
                return center(n)
            continue
        t, d = n.get("text", ""), n.get("content-desc", "")
        c = center(n)
        if not c:
            continue
        if exact is None and (t == label or d == label):
            exact = c
        if part is None and (label in t or label in d):
            part = c
    return exact or part

cmd = sys.argv[1]
if cmd == "tap":
    p = find(sys.argv[2])
    if not p:
        print("NICHT GEFUNDEN: " + sys.argv[2]); sys.exit(1)
    adb("shell", "input", "tap", str(p[0]), str(p[1])); print("getippt", sys.argv[2], p)
elif cmd == "tapclass":
    p = find(cls=sys.argv[2])
    if not p:
        print("NICHT GEFUNDEN: " + sys.argv[2]); sys.exit(1)
    adb("shell", "input", "tap", str(p[0]), str(p[1])); print("getippt", sys.argv[2], p)
elif cmd == "has":
    x = dump().lower()
    alts = [a.lower() for a in sys.argv[2].split("|")]
    txt = " ".join((n.get("text", "") + " " + n.get("content-desc", "")).lower() for n in nodes(x))
    sys.exit(0 if any(a in txt for a in alts) else 1)
elif cmd == "texts":
    for n in nodes(dump()):
        t = (n.get("text", "") or n.get("content-desc", "")).strip()
        if t:
            print(n.get("class", ""), "|", t[:100])
