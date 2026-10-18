# Opens the generated deck in PowerPoint, saves it with the brand fonts embedded, exports each slide as PNG and the deck as PDF.
# Dark: .\finalize.ps1   Light: .\finalize.ps1 -Raw refill-deck-light-raw.pptx -Out ...\Refill-Final-Deck-Light.pptx -Png png-light
param(
  [string]$Out = 'Z:\claude\refill\docs\team\Refill-Final-Deck.pptx',
  [string]$Raw = 'refill-deck-raw.pptx',
  [string]$Png = 'png'
)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $dir $Raw
$png = Join-Path $dir $Png
New-Item -ItemType Directory -Force $png | Out-Null
Get-ChildItem $png -Filter *.png | Remove-Item -Force
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($raw, $true, $false, $false)   # read-only, untitled, no window
  try { $p.SaveSubsetFonts = 0 } catch { "SaveSubsetFonts not supported" }   # embed whole fonts so new text still renders
  $p.SaveAs($Out, 24, -1)                                       # pptx, EmbedTrueTypeFonts = true
  $i = 0
  foreach ($s in $p.Slides) { $i++; $s.Export((Join-Path $png ("slide-{0}.png" -f $i)), 'PNG', 1920, 1080) }
  $p.SaveAs([System.IO.Path]::ChangeExtension($Out, '.pdf'), 32)  # ppSaveAsPDF
  "saved $Out (+ pdf) with $i slides; fonts: " + (($p.Fonts | ForEach-Object { $_.Name + ($(if ($_.Embedded) { '*' } else { '' })) }) -join ', ')
  $p.Close()
} finally { $app.Quit() }
