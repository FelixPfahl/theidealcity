# Atelier Folien: PowerPoint fernsteuern (eine Zeile JSON rein, eine Zeile JSON raus).
# Läuft als Hintergrundprozess des Programms; öffnet Präsentationen nur schreibgeschützt.
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.Encoding]::UTF8
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$app = $null; $pres = $null; $wir = $false

$rid = 0
function Antwort($o) { $o.id = $script:rid; [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress -Depth 4)); [Console]::Out.Flush() }
function Ansicht() {
  if (-not $pres) { return $null }
  try { $w = $pres.SlideShowWindow; if ($w) { return $w.View } } catch {}
  return $null
}
function Stand() {
  $v = Ansicht
  if (-not $v) { return @{ ok = $true; laeuft = $false } }
  $s = 0; try { $s = $v.Slide.SlideIndex } catch { $s = $pres.Slides.Count + 1 }
  $n = 0; try { $n = $v.GetClickIndex() } catch {}
  return @{ ok = $true; laeuft = $true; folie = $s; klick = $n; zustand = $v.State }
}
function Schliessen() {
  $v = Ansicht; if ($v) { try { $v.Exit() } catch {} }
  if ($pres) { try { $pres.Close() } catch {} }
  $script:pres = $null
  if ($app -and $wir) { try { if ($app.Presentations.Count -eq 0) { $app.Quit() } } catch {} ; $script:app = $null; $script:wir = $false }
}

while ($true) {
  $zeile = [Console]::In.ReadLine()
  if ($null -eq $zeile) { break }
  try {
    $c = $zeile | ConvertFrom-Json
    $script:rid = $c.id
    switch ($c.cmd) {
      'hallo' { Antwort @{ ok = $true } }
      'open' {
        Schliessen
        if (-not $app) {
          try { $script:app = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') } catch { $script:app = New-Object -ComObject PowerPoint.Application; $script:wir = $true }
        }
        # schreibgeschützt (-1), mit Fenster (-1), damit die Bildschirmpräsentation sicher startet
        $script:pres = $app.Presentations.Open([string]$c.path, -1, 0, -1)
        try { $pres.Windows(1).WindowState = 2 } catch {}
        $texte = @()
        foreach ($f in $pres.Slides) {
          $t = ''
          foreach ($sh in $f.Shapes) { try { if ($sh.HasTextFrame -and $sh.TextFrame.HasText) { $t += ' ' + $sh.TextFrame.TextRange.Text } } catch {} }
          $texte += $t
        }
        Antwort @{ ok = $true; anzahl = $pres.Slides.Count; texte = $texte }
      }
      'show' {
        $set = $pres.SlideShowSettings
        $set.ShowType = 1            # Vortragender, Vollbild
        $set.AdvanceMode = 1         # von Hand weiter (Klick, Presenter, Handy)
        try { $set.ShowPresenterView = 0 } catch {}
        $set.StartingSlide = 1; $set.EndingSlide = $pres.Slides.Count
        $w = $set.Run()
        $ziel = [Math]::Max(1, [Math]::Min([int]$c.folie, $pres.Slides.Count))
        if ($ziel -gt 1) { $w.View.GotoSlide($ziel) }
        $o = Stand
        try { $o.links = $w.Left; $o.oben = $w.Top; $o.breite = $w.Width; $o.hoehe = $w.Height } catch {}
        Antwort $o
      }
      'goto' { $v = Ansicht; if ($v) { $v.GotoSlide([int]$c.folie) }; Antwort (Stand) }
      'next' { $v = Ansicht; if ($v) { $v.Next() }; Antwort (Stand) }
      'prev' { $v = Ansicht; if ($v) { $v.Previous() }; Antwort (Stand) }
      'state' { Antwort (Stand) }
      'end' { Schliessen; Antwort @{ ok = $true } }
      default { Antwort @{ ok = $false; fehler = 'unbekannt' } }
    }
  } catch { Antwort @{ ok = $false; fehler = $_.Exception.Message } }
}
Schliessen
