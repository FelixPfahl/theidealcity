# Atelier (Android-App)

Hülle für Josefs Web-Apps: Atelier (Start), Pult (Unterricht), Morgenrunde (Quiz).
Die Inhalte kommen aus den Zweigen `atelier`, `pult` und `morgenrunde`; die App lädt sie selbst, offline gilt der letzte Stand.

- `android/`: App-Projekt (WebView, Bildschirm bleibt wach, Vibration über `window.AtelierApp.vibrate(ms)`).
- `.github/workflows/android.yml`: GitHub baut die APK bei jeder Änderung, testet sie im Android-Emulator und legt alles in `ausgabe/` ab.
- `ausgabe/atelier.apk`: aktuelle App zum Installieren.
- Signatur: Secrets `ATELIER_KEYSTORE_BASE64`, `ATELIER_KEYSTORE_PASSWORD`, `ATELIER_KEY_ALIAS`, `ATELIER_KEY_PASSWORD`; ohne Secrets Test-Schlüssel.

Erstellt mit Unterstützung von Claude (KI-Assistent von Anthropic).
