param (
    [switch]$SkipBuild
)

$nodeArgs = @()
if ($SkipBuild) {
    $nodeArgs += "--skip-build"
}

Write-Host "Iniciando deploy de alta velocidade para a Hostinger via Node.js..." -ForegroundColor Cyan
node scripts/deploy-hostinger.mjs @nodeArgs
exit $LASTEXITCODE
