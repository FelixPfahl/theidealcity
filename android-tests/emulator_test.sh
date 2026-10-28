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
check(){ if $UI has "$2"; then ok "$1"; else bad "$1 (erwartet: $2)"; fi; }
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

# 2. Start mitten in der Stunde springt zu Pult
setclock 1150 00
start; sleep 22; shot 01_start_in_der_stunde
check "Start während der Stunde öffnet Pult" "Mini-Skizzen"

# 3. Reiter
tap "Heute"; sleep 3; check "Reiter Heute" "Auf dem Schulweg"; shot 02_heute
tap "Morgenrunde"; sleep 10; check "Reiter Morgenrunde" "archiv"; shot 03_morgenrunde
tap "Pult"; sleep 3; check "Reiter Pult" "Mini-Skizzen"

# 4. Pult-Tasten
tap "+5 Min."; sleep 2; check "+5 Min. verlängert und gleicht aus" "Ausgleich in"
tap "Weiter"; sleep 2; check "Weiter springt zur nächsten Phase" "Zwischenhalt"
tap "Zurück"; sleep 2; tap "Zurück"; sleep 2; check "Zurück nimmt beides zurück" "Mini-Skizzen"
shot 04_pult

# 5. Ansichten Tag und Spick
tap "Tag"; sleep 2; check "Pult-Ansicht Tag" "Noch zu drucken"; shot 05_tag
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
check "Querformat: Restzeit sichtbar" "bis 12."
adb shell settings put system user_rotation 0; sleep 3
check "Nach dem Drehen weiter in Pult" "Mini-Skizzen"

# 8. Phasenwechsel nach Uhrzeit, mit Vibration
setclock 1224 50; sleep 22
check "Phase wechselt nach Uhrzeit" "Zwischenhalt"
if adb shell dumpsys vibrator_manager 2>/dev/null | grep -q "$PKG"; then ok "Vibration beim Phasenwechsel ausgelöst"
else bad "Vibration beim Phasenwechsel nicht nachweisbar"; fi
shot 08_phasenwechsel

# 9. Zurück-Taste
tap "Morgenrunde"; sleep 3
adb shell input keyevent KEYCODE_BACK; sleep 3
check "Zurück-Taste führt zu Heute" "Auf dem Schulweg"
adb shell input keyevent KEYCODE_BACK; sleep 3
if adb shell dumpsys activity activities | grep -E "ResumedActivity" | grep -q "$PKG"; then bad "Zweites Zurück schließt die App nicht"
else ok "Zweites Zurück schließt die App"; fi

# 10. Ohne Netz
setclock 1226 00
adb shell svc wifi disable; adb shell svc data disable; sleep 3
adb shell am force-stop "$PKG"; start --es tab pult; sleep 14
check "Ohne Netz: Pult mit gespeichertem Stand" "Zwischenhalt|Stern und Wunsch"; shot 10_offline_pult
start --es tab morgenrunde; sleep 6
check "Ohne Netz: Morgenrunde" "archiv"; shot 10_offline_morgenrunde
start --es tab atelier; sleep 4
check "Ohne Netz: Heute" "Auf dem Schulweg"
adb shell svc wifi enable; adb shell svc data enable

adb logcat -d -t 800 > ausgabe/logcat.txt
echo "---" >> "$R"
echo "Fehler insgesamt: $N" | tee -a "$R"
exit 0
