$agilePath = (Resolve-Path -LiteralPath 'E:\TaskSyncEnterprise\Report\Agile').Path
$lockNames = @(
    '~$ily_Scrum_2_Sprint_TaskSyncEnterprise.docx',
    '~$o_cao_Agile_Scrum_TaskSyncEnterprise.docx'
)

foreach ($lockName in $lockNames) {
    $target = Join-Path $agilePath $lockName
    if ((Split-Path -Parent $target) -ne $agilePath) {
        throw "Target escaped expected directory: $target"
    }
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Force
    }
}

Get-ChildItem -LiteralPath 'E:\TaskSyncEnterprise\Report' -Recurse -Force -File |
    Where-Object { $_.Name.StartsWith('~$') } |
    Select-Object FullName
