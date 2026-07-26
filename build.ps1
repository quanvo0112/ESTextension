<#
  Build script: packages extension source into a clean .zip for GitHub release.
  Only manifest.json + src/ go in the zip — no repo tooling/config files.
#>

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$distDir = Join-Path $root 'dist'
$stageDir = Join-Path $distDir 'stage'
$zipName = "subjects-table-extractor-v$version.zip"
$zipPath = Join-Path $distDir $zipName

if (Test-Path $stageDir) {
  Remove-Item $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

Copy-Item (Join-Path $root 'manifest.json') -Destination $stageDir
Copy-Item (Join-Path $root 'src') -Destination $stageDir -Recurse

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item $stageDir -Recurse -Force

Write-Output "Built $zipPath"
