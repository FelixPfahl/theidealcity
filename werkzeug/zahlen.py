"""Zahlen fuer das Ohr (Josef 1.11.2026: "Zahlen werden nie richtig vorgelesen").
sprich(text) schreibt Uhrzeiten, Daten, Jahreszahlen, Kommazahlen, Prozent und Ziffern als deutsche Woerter aus.
Texte ohne Ziffern bleiben unveraendert (deshalb bleiben gecachte Clips gueltig)."""
import re
try:
    from num2words import num2words as _n
except ImportError:  # im Morgenlauf einmal nachinstallieren, sonst Text unveraendert
    try:
        import subprocess, sys
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--break-system-packages", "num2words"], check=True, capture_output=True, timeout=120)
        from num2words import num2words as _n
    except Exception:
        _n = None

MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
DATIV = {"am", "vom", "zum", "im", "beim", "dem", "den", "ab", "seit", "bis", "zur"}


def _teile(w):
    # lange Zahlwörter für die Stimme in Teile trennen: "zweitausendsechsundzwanzig" -> "zweitausend sechsundzwanzig"
    return re.sub(r"(tausend|hundert)(?=[a-zäöü])", r"\1 ", w)


def card(x):
    return _teile(_n(int(x), lang="de"))


def ordn(x, prev):
    w = _n(int(x), lang="de", to="ordinal")          # "neunte"
    p = (prev or "").lower().strip(",")
    if p in DATIV: return w + "n"
    if p in ("der", "die", "das"): return w
    return w + "r"


def jahr(x):
    v = int(x)
    return _teile(_n(v, lang="de", to="year")) if 1100 <= v <= 2199 else card(v)


# Abkürzungen so geschrieben, wie man sie spricht (Josef 1.11.2026: "ICE klappt nicht, das muss als Text irgendwie tricksen")
ABK = {"ICE": "Ih-Zeh-Eh", "ICEs": "Ih-Zeh-Ehs", "IC": "Ih-Zeh", "MVV": "Em-Vau-Vau", "MVG": "Em-Vau-Geh", "DB": "De-Be",
       "FAZ": "Eff-Ah-Zett", "FAS": "Eff-Ah-Ess", "SZ": "Ess-Zett", "NZZ": "En-Zett-Zett", "KI": "Ka-Ih", "USA": "U-Ess-Ah",
       "PC": "Peh-Zeh", "AG": "Ah-Geh", "ARD": "Ah-Er-De", "ZDF": "Zett-De-Eff", "EU": "Eh-Uh", "BR": "Beh-Er", "WDR": "Weh-De-Er",
       "NDR": "En-De-Er", "SWR": "Ess-Weh-Er", "TU": "Teh-Uh", "LMU": "Ell-Em-Uh", "ÖPNV": "Öffentlicher Nahverkehr",
       "RE": "Regionalexpress", "RB": "Regionalbahn", "ZOB": "Zentraler Omnibusbahnhof", "ca.": "zirka", "z. B.": "zum Beispiel",
       "bzw.": "beziehungsweise", "usw.": "und so weiter", "Nr.": "Nummer", "Std.": "Stunden", "Min.": "Minuten", "km": "Kilometer"}
_ABK_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(k) for k in sorted(ABK, key=len, reverse=True)) + r")(?![\w])")


def abk(t):
    return _ABK_RE.sub(lambda m: ABK[m.group(1)], t)


def sprich(t):
    t = abk(t)
    if _n is None or not re.search(r"\d", t): return t
    t = re.sub(r"(?<=[A-Za-zÄÖÜäöü])(?=\d)", " ", t)   # "U6" -> "U 6"
    t = re.sub(r"X Æ A-?(\d+)", lambda m: "X Æ A " + card(m.group(1)).capitalize(), t)
    t = re.sub(r"\bA-(\d+)\b", lambda m: "A " + card(m.group(1)).capitalize(), t)
    # Uhrzeiten 8:15 und "8 Uhr 15"
    t = re.sub(r"\b(\d{1,2}):(\d{2})\b", lambda m: card(m.group(1)) + " Uhr" + ("" if m.group(2) == "00" else " " + card(m.group(2))), t)
    t = re.sub(r"\b(\d{1,2}) Uhr (\d{1,2})\b", lambda m: card(m.group(1)) + " Uhr " + card(m.group(2)), t)
    t = re.sub(r"\b(\d{1,2}) Uhr\b", lambda m: ("ein" if m.group(1) == "1" else card(m.group(1))) + " Uhr", t)
    # Daten 9.11. -> 9. November
    t = re.sub(r"\b(\d{1,2})\.(\d{1,2})\.(\d{4})?", lambda m: m.group(1) + ". " + MON[int(m.group(2)) - 1] + (" " + m.group(3) if m.group(3) else "") if 1 <= int(m.group(2)) <= 12 else m.group(0), t)
    t = re.sub(r"(\S+)?(\s)(\d{1,2})\. (" + "|".join(MON) + r")\b", lambda m: (m.group(1) or "") + m.group(2) + ordn(m.group(3), m.group(1)) + " " + m.group(4), t)
    # Kommazahlen und Prozent
    t = re.sub(r"\b(\d+),(\d+)\b", lambda m: card(m.group(1)) + " Komma " + " ".join(card(c) for c in m.group(2)), t)
    t = re.sub(r"(\d)\s?%", r"\1 Prozent", t)
    # Jahreszahlen, Klassen (6a), uebrige Zahlen
    t = re.sub(r"\b(\d{4})\b", lambda m: jahr(m.group(1)), t)
    t = re.sub(r"\b(\d{1,2})([a-e])\b", lambda m: card(m.group(1)) + " " + m.group(2), t)
    t = re.sub(r"\b(\d+)\.(?=\s)", lambda m: _n(int(m.group(1)), lang="de", to="ordinal"), t)
    t = re.sub(r"\d+", lambda m: card(m.group(0)), t)
    return t


if __name__ == "__main__":
    import sys
    for s in sys.argv[1:]: print(sprich(s))
