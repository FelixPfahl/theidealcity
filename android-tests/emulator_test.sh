#!/bin/bash
# Gründlicher Test der Atelier-App im Android-Emulator. Ergebnis: ausgabe/testbericht.txt und Bildschirmfotos.
set -u
mkdir -p ausgabe
R=ausgabe/testbericht.txt; : > "$R"
UI="python3 android-tests/ui.py"
PKG=de.theidealcity.atelier
NEU=android/app/build/outputs/apk/release/app-release.apk
N=0
ok()   { echo "OK      $1" | tee -a "$R"; }
bad()  { echo "FEHLER  $1" | tee -a "$R"; N=$((N+1)); $UI texts > "ausgabe/ui_fehler_$N.txt" 2>/dev/null; adb exec-out screencap -p > "ausgabe/fehler_$N.png"; }
check(){ for _ in 1 2 3 4; do if $UI has "$2"; then ok "$1"; return; fi; sleep 4; done; bad "$1 (erwartet: $2)"; }
shot() { adb exec-out screencap -p > "ausgabe/test_$1.png"; }
start(){ adb shell am start -W -n "$PKG/.MainActivity" "$@" > /dev/null; }
tap()  { $UI tap "$1" > /dev/null || echo "  (nicht gefunden: $1)" | tee -a "$R"; }

echo "Testtag laut Daten: ${DATA_DATE:-unbekannt}" | tee -a "$R"
Y=${DATA_DATE:0:4}; M=${DATA_DATE:5:2}; D=${DATA_DATE:8:2}
adb root > /dev/null 2>&1; sleep 4; adb wait-for-device
adb shell settings put global auto_time 0
setclock(){ adb shell date "${M}${D}$1${Y}.$2" > /dev/null; }

# 1. Update über die vorige Fassung
if [ -f ausgabe/atelier.apk ]; then
  adb install ausgabe/atelier.apk > /dev/null 2>&1
  if adb install -r "$NEU" 2>&1 | grep -q Success; then ok "Update über die vorige Fassung ohne Neuinstallation"
  else bad "Update über die vorige Fassung (anderer Signaturschlüssel)"; adb uninstall "$PKG" > /dev/null; adb install "$NEU" > /dev/null; fi
else
  adb install "$NEU" > /dev/null
fi

ATELIER_SCHLUESSEL=$(printf %s "${ATELIER_SCHLUESSEL:-}" | tr -d ' \n\r')
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS 2>/dev/null || true

# Erwartungen kommen aus den Tagesdaten (android-tests/erwartung.py): E_P1, E_P2, E_P3, E_BIS, T_P1, T_WECHSEL, T_OFFLINE
if [ "${MIT_DATEN:-0}" != "1" ]; then
  echo "Kein Atelier-Schlüssel: nur Start- und Leistentest" | tee -a "$R"
  adb shell settings put global auto_time 1
  start; sleep 20; shot 01_start
  check "Start ohne Schlüssel zeigt Heute" "Auf dem Schulweg|Schlüssel"
  tap "Pult"; sleep 4; check "Leiste: Pult" "Schlüssel|Pult"
  echo "---" >> "$R"; echo "Fehler insgesamt: $N" | tee -a "$R"; exit 0
fi
echo "Erwartet: $E_P1 / $E_P2 / $E_P3" | tee -a "$R"
# Atelier-Schlüssel einmal über den Link-Anker übergeben (Pult speichert ihn lokal, Atelier liest ihn mit)
setclock "$T_P1" 00
# (Anführungszeichen für die Shell auf dem Gerät, sonst gilt # dort als Kommentar)
adb shell am start -W -n "$PKG/.MainActivity" --es url "'https://app.atelier/pult/index.html#s=$ATELIER_SCHLUESSEL'" > /dev/null; sleep 14
if $UI has "Schlüssel nötig|Schlüssel eingeben"; then bad "Atelier-Schlüssel wurde nicht übernommen"; else ok "Atelier-Schlüssel über den Link übernommen"; fi
adb shell am force-stop "$PKG"

# 2. Start mitten in der Stunde springt zu Pult
setclock "$T_P1" 00
start; sleep 22; shot 01_start_in_der_stunde
check "Start während der Stunde öffnet Pult" "$E_P1"

# 3. Leiste unten und Kacheln
tap "Heute"; sleep 3; check "Leiste: Heute" "Auf dem Schulweg"; shot 02_heute
tap "Morgenrunde"; sleep 10; check "Kachel Morgenrunde" "archiv"; shot 03_morgenrunde
tap "Pult"; sleep 3; check "Leiste: Pult" "$E_P1"
tap "Fernbedienung"; sleep 3; check "Leiste: Fernbedienung" "Noch nicht gekoppelt"; shot 03_fernbedienung
tap "Pult"; sleep 3; check "Leiste: zurück von Fernbedienung zu Pult" "$E_P1"
tap "Heute"; sleep 3; tap "Folien"; sleep 4; check "Kachel Folien öffnet die Fernbedienung" "Noch nicht gekoppelt"
tap "Heute"; sleep 3; tap "Pult"; sleep 4; check "Kachel Pult wechselt jederzeit" "$E_P1|Noch nicht gekoppelt"
tap "Jetzt"; sleep 2

# 4. Pult-Tasten
tap "+5 Min."; sleep 2; check "+5 Min. verlängert und gleicht aus" "Ausgleich in"
tap "Weiter"; sleep 2; check "Weiter springt zur nächsten Phase" "$E_P2"
tap "Zurück"; sleep 2; tap "Zurück"; sleep 2; check "Zurück nimmt beides zurück" "$E_P1"
shot 04_pult

# 5. Ansichten Tag und Spick
tap "Tag"; sleep 2; check "Pult-Ansicht Tag" "drucken|Ablauf"; shot 05_tag
tap "Spick"; sleep 2; check "Pult-Ansicht Spick" "Impulsfragen"; shot 05_spick

# 6. Notiz bleibt nach Neustart
tap "Notiz"; sleep 2
$UI tapclass "android.widget.EditText" > /dev/null; sleep 1
adb shell input text "Testnotiz_Emulator"; sleep 3
adb shell am force-stop "$PKG"; start; sleep 15
tap "Pult"; sleep 2; tap "Notiz"; sleep 2
check "Notiz bleibt nach Neustart" "Testnotiz_Emulator"; shot 06_notiz

# 7. Drehen
tap "Jetzt"; sleep 2
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1; sleep 4; shot 07_quer
check "Querformat: Restzeit sichtbar" "$E_BIS"
adb shell settings put system user_rotation 0; sleep 3
check "Nach dem Drehen weiter in Pult" "$E_P1|$E_P2"

# 8. Phasenwechsel nach Uhrzeit, mit Vibration
setclock "$T_WECHSEL" 50; sleep 22
check "Phase wechselt nach Uhrzeit" "$E_P2"
if adb shell dumpsys vibrator_manager 2>/dev/null | grep -q "$PKG"; then ok "Vibration beim Phasenwechsel ausgelöst"
else bad "Vibration beim Phasenwechsel nicht nachweisbar"; fi
shot 08_phasenwechsel

# 8b. Benachrichtigung bei gesperrtem Handy: App in den Hintergrund, Wecker zur nächsten Phase
adb shell input keyevent KEYCODE_HOME; sleep 2
if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "$PKG"; then ok "Benachrichtigung mit laufender Phase im Hintergrund"
else bad "Keine Benachrichtigung im Hintergrund"; fi
if adb shell dumpsys alarm 2>/dev/null | grep -q "$PKG"; then ok "Wecker für den nächsten Phasenwechsel gestellt"
else bad "Kein Wecker für den Phasenwechsel"; fi
shot 08b_hintergrund
start; sleep 4

# 8c. Lautstärketasten: ohne Kopplung normale Lautstärke, kein Absturz
adb shell input keyevent KEYCODE_VOLUME_UP; sleep 1
if adb shell dumpsys activity activities | grep -E "ResumedActivity" | grep -q "$PKG"; then ok "Lautstärketaste ohne Kopplung: App läuft weiter"
else bad "App nach Lautstärketaste weg"; fi

# 9. Zurück-Taste
tap "Heute"; sleep 3; tap "Morgenrunde"; sleep 4
adb shell input keyevent KEYCODE_BACK; sleep 3
check "Zurück-Taste führt zu Heute" "Auf dem Schulweg"
adb shell input keyevent KEYCODE_BACK; sleep 3
if adb shell dumpsys activity activities | grep -E "ResumedActivity" | grep -q "$PKG"; then bad "Zweites Zurück schließt die App nicht"
else ok "Zweites Zurück schließt die App"; fi

# 10. Ohne Netz
setclock "$T_OFFLINE" 00
adb shell svc wifi disable; adb shell svc data disable; sleep 3
adb shell am force-stop "$PKG"; start --es tab pult; sleep 14
check "Ohne Netz: Pult mit gespeichertem Stand" "$E_P2|$E_P3"; shot 10_offline_pult
start --es tab morgenrunde; sleep 6
check "Ohne Netz: Morgenrunde" "archiv"; shot 10_offline_morgenrunde
start --es tab atelier; sleep 4
check "Ohne Netz: Heute" "Auf dem Schulweg"
check "Heute bleibt Heute, auch während der Stunde" "Auf dem Schulweg"
adb shell svc wifi enable; adb shell svc data enable

adb logcat -d -t 800 > ausgabe/logcat.txt
echo "---" >> "$R"
echo "Fehler insgesamt: $N" | tee -a "$R"
exit 0
