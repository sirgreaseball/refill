# Fills in the contents page of the financial brief in Word, saves it, and exports a PDF.
# Pass another .docx to do the same for it (for example the credits document).
param([string]$f = 'Z:\claude\refill\docs\team\Refill-Financial-Projections-Brief.docx')
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($f, $false, $false)
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Save()
  $pdf = [System.IO.Path]::ChangeExtension($f, '.pdf')
  $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
  "{0} pages -> {1}" -f $doc.ComputeStatistics(2), (Split-Path $pdf -Leaf)
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
