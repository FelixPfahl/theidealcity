; Inka für Windows: Setup-Assistent (Josef 1.11.2026)
; Nur für den aktuellen Benutzer, ohne Administrator-Rechte. Startmenü und Desktop, kein Autostart.
; Deinstallieren behält Schlüssel und Einstellungen (%LOCALAPPDATA%\Inka).
; Stiller Modus für Updates: Inka-Setup.exe /S [/RUN]  (/RUN startet Inka danach wieder)

Unicode true
SetCompressor /SOLID lzma
RequestExecutionLevel user

!ifndef VERSION
  !define VERSION "1.1.0"
!endif
!define APP "Inka"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Inka"

Name "${APP}"
OutFile "out\Inka-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Inka"
InstallDirRegKey HKCU "${UNKEY}" "InstallLocation"
BrandingText "Inka ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Inka"
VIAddVersionKey "FileDescription" "Inka Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "CompanyName" "The Ideal City"
VIAddVersionKey "LegalCopyright" "Josef"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "inka.ico"
!define MUI_UNICON "inka.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Willkommen bei Inka"
!define MUI_WELCOMEPAGE_TEXT "Inka spielt deine Morning-Show mit Inka, Wagner und Sigma, dazu deine Woche, Aufgaben und Nachrichten.$\r$\n$\r$\nInka wird nur für dich installiert, Administrator-Rechte sind nicht nötig. Updates holt sich Inka danach selbst.$\r$\n$\r$\nKlicke auf Weiter."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Inka.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Inka jetzt starten"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "German"

Var tries

Section "Inka" SecMain
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  ; Läuft Inka noch (z. B. beim Update), warten, bis die Datei frei ist
  StrCpy $tries 0
  retry:
    ClearErrors
    File "out\Inka.exe"
    IfErrors 0 copied
    IntOp $tries $tries + 1
    IntCmp $tries 40 failed
    Sleep 500
    Goto retry
  failed:
    MessageBox MB_ICONEXCLAMATION|MB_OK "Inka läuft noch. Bitte Inka schließen und das Setup erneut starten." /SD IDOK
    Abort
  copied:
  File "inka.ico"
  WriteUninstaller "$INSTDIR\Inka deinstallieren.exe"

  CreateShortCut "$SMPROGRAMS\Inka.lnk" "$INSTDIR\Inka.exe" "" "$INSTDIR\inka.ico"
  CreateShortCut "$DESKTOP\Inka.lnk" "$INSTDIR\Inka.exe" "" "$INSTDIR\inka.ico"

  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Inka"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "The Ideal City"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\inka.ico"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Inka deinstallieren.exe"'
  WriteRegStr HKCU "${UNKEY}" "QuietUninstallString" '"$INSTDIR\Inka deinstallieren.exe" /S'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" "$0"

  ; Nach einem stillen Update Inka wieder starten
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/RUN" $R1
  IfErrors +2 0
  Exec '"$INSTDIR\Inka.exe"'
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$INSTDIR\Inka.exe"
  Delete "$INSTDIR\inka.ico"
  Delete "$INSTDIR\Inka deinstallieren.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\Inka.lnk"
  Delete "$DESKTOP\Inka.lnk"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\Classes\inka"
  ; Schlüssel und Einstellungen in %LOCALAPPDATA%\Inka bleiben erhalten (Josef 1.11.2026)
SectionEnd
