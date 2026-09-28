[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "FAIL: $Message" }
}

function Get-Headers {
    param([string]$Path)
    return (Get-Content -LiteralPath $Path -TotalCount 1).Split(',')
}

function Assert-Headers {
    param([string]$Path, [string[]]$Required)
    $headers = Get-Headers $Path
    foreach ($name in $Required) {
        Assert-True ($headers -contains $name) "$Path is missing header '$name'"
    }
}

$matrixPath = Join-Path $root 'dependency-matrix.csv'
$v1Path = Join-Path $root 'fixtures/history-temp-v1.csv'
$v2Path = Join-Path $root 'fixtures/history-temp-v2-renamed.csv'
$reportPath = Join-Path $root 'expected/daily-temperature-report.csv'

Assert-Headers $matrixPath @('relation_id','from_id','from_type','to_id','to_type','access','contract_field','path_kind','condition','evidence','owner','verification_state')
Assert-Headers $v1Path @('sample_time','equipment_id','temp_avg','quality')
Assert-Headers $v2Path @('sample_time','equipment_id','temperature_mean','quality')
Assert-True (-not ((Get-Headers $v2Path) -contains 'temp_avg')) 'v2 must demonstrate removal of temp_avg'
Assert-Headers $reportPath @('report_date','equipment_id','daily_temperature_mean','valid_count','null_count','source_contract')

$matrix = Import-Csv -LiteralPath $matrixPath
Assert-True ($matrix.Count -gt 0) 'matrix must have at least one relation'
Assert-True (($matrix.relation_id | Sort-Object -Unique).Count -eq $matrix.Count) 'relation_id values must be unique'
foreach ($row in $matrix) {
    Assert-True ($row.access -in @('Read','Write','Filter','Render','Authorize')) "unsupported access '$($row.access)' in $($row.relation_id)"
    Assert-True ($row.path_kind -eq 'direct') "fixture relations must be direct; indirect impact is graph-derived ($($row.relation_id))"
    $evidencePath = Join-Path $root $row.evidence
    Assert-True (Test-Path -LiteralPath $evidencePath -PathType Leaf) "evidence file does not exist for $($row.relation_id): $($row.evidence)"
}

# Convert consumer -> provider records to provider -> consumer traversal for impact analysis.
$changedResource = 'dataset:history-temp'
$queue = [System.Collections.Generic.Queue[string]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
$impacted = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
$queue.Enqueue($changedResource)
[void]$seen.Add($changedResource)
while ($queue.Count -gt 0) {
    $provider = $queue.Dequeue()
    foreach ($edge in ($matrix | Where-Object { $_.to_id -eq $provider })) {
        if ($seen.Add($edge.from_id)) {
            [void]$impacted.Add($edge.from_id)
            $queue.Enqueue($edge.from_id)
        }
    }
}

$expectedImpacted = @('report:daily-temperature','screen:daily-report','screen:overview','screen:temperature')
$actualImpactedText = @($impacted | Sort-Object) -join '|'
$expectedImpactedText = @($expectedImpacted | Sort-Object) -join '|'
Assert-True ($actualImpactedText -eq $expectedImpactedText) 'impacted resource set differs from the declared dependency graph'
Assert-True (-not $impacted.Contains('screen:flow')) 'screen:flow must not be impacted by dataset:history-temp'

$source = @(Import-Csv -LiteralPath $v1Path)
$renamed = @(Import-Csv -LiteralPath $v2Path)
Assert-True ($source.Count -eq $renamed.Count) 'v2 must preserve the v1 row count'
for ($index = 0; $index -lt $source.Count; $index++) {
    Assert-True ($source[$index].sample_time -eq $renamed[$index].sample_time) "v2 changed sample_time at row $index"
    Assert-True ($source[$index].equipment_id -eq $renamed[$index].equipment_id) "v2 changed equipment_id at row $index"
    Assert-True ($source[$index].quality -eq $renamed[$index].quality) "v2 changed quality at row $index"
    Assert-True ($source[$index].temp_avg -eq $renamed[$index].temperature_mean) "v2 changed the renamed value at row $index"
}

$goodRows = @($source | Where-Object { $_.quality -eq 'Good' })
$validRows = @($goodRows | Where-Object { -not [string]::IsNullOrWhiteSpace($_.temp_avg) })
$nullCount = @($goodRows | Where-Object { [string]::IsNullOrWhiteSpace($_.temp_avg) }).Count
$mean = ($validRows | Measure-Object -Property temp_avg -Average).Average
$expected = @(Import-Csv -LiteralPath $reportPath)
Assert-True ($expected.Count -eq 1) 'expected report must contain one row'
Assert-True ([decimal]$expected[0].daily_temperature_mean -eq [decimal]$mean) 'expected report mean does not match fixture'
Assert-True ([int]$expected[0].valid_count -eq $validRows.Count) 'expected valid_count does not match fixture'
Assert-True ([int]$expected[0].null_count -eq $nullCount) 'expected null_count does not match fixture'
Assert-True ($expected[0].source_contract -eq 'temp_avg') 'expected report must state the v1 source contract'

Write-Host "PASS: v1 contract, v2 rename, evidence paths, impact graph, and expected report values are consistent."
Write-Host "Impacted: $(@($impacted | Sort-Object) -join ', ')"
