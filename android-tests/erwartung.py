"""Erwartungen für den Emulator-Test aus den Tagesdaten (daten/heute.json von Pult).
Aufruf: python3 android-tests/erwartung.py heute.json  -> Zeilen KEY=Wert für GITHUB_ENV"""
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
L = next(it for it in d["items"] if it["type"] == "lesson" and len(it["phases"]) >= 4)
ph = L["phases"]
def hm(t, plus=0):
    h, m = map(int, t.split(":")); m = h * 60 + m + plus
    return "%02d%02d" % (m // 60, m % 60)
def mm(t, plus=0):
    h, m = map(int, t.split(":")); m = h * 60 + m + plus
    return m
p1, p2, p3 = ph[1][3], ph[2][3], ph[3][3]
end1 = mm(ph[1][0], ph[1][1]) - 1
out = {
    "T_P1": hm(ph[1][0], 1),          # mitten in Phase 2 der Stunde
    "T_WECHSEL": "%02d%02d" % (end1 // 60, end1 % 60),  # eine Minute vor Ende dieser Phase (Sekunden 50)
    "T_OFFLINE": hm(ph[2][0], 1),
    "E_P1": p1, "E_P2": p2, "E_P3": p3,
    "E_BIS": "bis " + str(int(ph[1][0].split(":")[0])) + ".",
    "E_TITEL": L["titel"][:20],
}
for k, v in out.items():
    print(k + "=" + v.replace("\n", " "))
