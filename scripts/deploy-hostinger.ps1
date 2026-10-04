param (
    [switch]$SkipBuild
)

$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host ">>> [1/4] Limpando pastas temporárias, cache e zip antigo..." -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, build, .cache, hostinger_deploy.zip

Write-Host ">>> [2/4] Disparando compilação e deploy para a Hostinger..." -ForegroundColor Cyan
$argsList = @()
if ($SkipBuild) {
    $argsList += "--skip-build"
}

node scripts/deploy-hostinger.mjs @argsList

if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> [4/4] Deploy finalizado com sucesso no servidor!" -ForegroundColor Green
} else {
    Write-Host ">>> [ERRO] O deploy falhou durante a transferência FTP ou extração pelo webhook." -ForegroundColor Red
}

exit $LASTEXITCODE
