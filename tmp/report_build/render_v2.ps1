$ErrorActionPreference = "Stop"

$qaRoot = "E:\TaskSyncEnterprise\tmp\report_build\docx_qa_v2"
$poppler = "C:\Users\huynh\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin"

$documents = @(
    @{
        Name = "agile"
        Path = "E:\TaskSyncEnterprise\Report\Agile\Bao_cao_Agile_Scrum_TaskSyncEnterprise.docx"
    },
    @{
        Name = "architecture"
        Path = (Get-ChildItem -LiteralPath "E:\TaskSyncEnterprise\Report" -Recurse -Filter "Bao_cao_Kien_truc_phan_mem_TaskSyncEnterprise.docx" | Select-Object -First 1 -ExpandProperty FullName)
    },
    @{
        Name = "daily1"
        Path = "E:\TaskSyncEnterprise\Report\Agile\Daily_Scrum_1_TaskSyncEnterprise.docx"
    },
    @{
        Name = "daily2"
        Path = "E:\TaskSyncEnterprise\Report\Agile\Daily_Scrum_2_TaskSyncEnterprise.docx"
    },
    @{
        Name = "diagrams"
        Path = (Get-ChildItem -LiteralPath "E:\TaskSyncEnterprise\Report" -Recurse -Filter "Thuyet_minh_So_do_TaskSyncEnterprise.docx" | Select-Object -First 1 -ExpandProperty FullName)
    }
)

New-Item -ItemType Directory -Force -Path $qaRoot | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    foreach ($item in $documents) {
        $name = $item.Name
        $docx = $item.Path
        $pdf = Join-Path $qaRoot "$name.pdf"
        $pngDir = Join-Path $qaRoot $name
        New-Item -ItemType Directory -Force -Path $pngDir | Out-Null

        $doc = $word.Documents.Open($docx, $false, $false)
        try {
            $doc.Fields.Update() | Out-Null
            foreach ($toc in $doc.TablesOfContents) {
                $toc.Update() | Out-Null
            }
            $doc.Save()
            $doc.ExportAsFixedFormat($pdf, 17)
        }
        finally {
            $doc.Close($false)
        }

        & (Join-Path $poppler "pdftoppm.exe") -r 110 -png $pdf (Join-Path $pngDir "page") | Out-Null
        $info = & (Join-Path $poppler "pdfinfo.exe") $pdf
        $pageLine = $info | Where-Object { $_ -match "^Pages:" }
        Write-Output "$name`t$pageLine"
    }
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
