# Opens each document in Word, fills in the table of contents and page numbers, saves it, and exports a PDF.
$ErrorActionPreference = 'Stop'
$files = @('Z:\claude\refill\docs\team\Refill-BTech-Master.docx', 'Z:\claude\refill\docs\team\Refill-MBA-Master.docx')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $files) {
    $doc = $word.Documents.Open($f, $false, $false)
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Save()
    $pdf = [System.IO.Path]::ChangeExtension($f, '.pdf')
    $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
    "{0}: {1} pages -> {2}" -f (Split-Path $f -Leaf), $doc.ComputeStatistics(2), (Split-Path $pdf -Leaf)
    $doc.Close($false)
  }
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
