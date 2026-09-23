param (
    [string]$FtpHost,
    [string]$FtpUser,
    [string]$FtpPass,
    [string]$RemoteDir = "/public_html",
    [switch]$SkipBuild
)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DEPLOY AUTOMÁTICO PARA A HOSTINGER" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Ler do .env caso não tenha sido passado por parâmetro
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line.StartsWith('#') -or [string]::IsNullOrWhiteSpace($line)) { return }
        if ($line -match '^HOSTINGER_FTP_HOST\s*=\s*(.*)$') {
            $val = $matches[1].Trim("'`"")
            if (-not $FtpHost) { $FtpHost = $val }
        }
        if ($line -match '^HOSTINGER_FTP_USER\s*=\s*(.*)$') {
            $val = $matches[1].Trim("'`"")
            if (-not $FtpUser) { $FtpUser = $val }
        }
        if ($line -match '^HOSTINGER_FTP_PASS\s*=\s*(.*)$') {
            $val = $matches[1].Trim("'`"")
            if (-not $FtpPass) { $FtpPass = $val }
        }
    }
}

if (-not $FtpHost -or -not $FtpUser -or -not $FtpPass) {
    Write-Host "❌ Credenciais de FTP não encontradas!" -ForegroundColor Red
    Write-Host "Configure as seguintes variáveis no seu arquivo .env:" -ForegroundColor Yellow
    Write-Host "HOSTINGER_FTP_HOST=147.93.38.246" -ForegroundColor Gray
    Write-Host "HOSTINGER_FTP_USER=seu-usuario-ftp" -ForegroundColor Gray
    Write-Host "HOSTINGER_FTP_PASS=sua-senha-ftp" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ou execute passando os parâmetros:" -ForegroundColor Yellow
    Write-Host ".\scripts\deploy-hostinger.ps1 -FtpHost '147.93.38.246' -FtpUser 'user' -FtpPass 'pass'" -ForegroundColor Gray
    exit 1
}

if (-not $SkipBuild) {
    Write-Host "`n📦 [1/3] Compilando a aplicação..." -ForegroundColor Green
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    cmd /c "npm run build"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha na compilação!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n⚡ [1/3] Pulando compilação (usando build existente)..." -ForegroundColor Green
}

Write-Host "`n📁 [2/3] Organizando arquivos na pasta 'hostinger'..." -ForegroundColor Green
node scripts/package-hostinger.mjs --skip-build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao empacotar os arquivos!" -ForegroundColor Red
    exit 1
}

# Auto-detectar se a conta FTP já está na raiz pública ou se deve usar /public_html
try {
    $checkReq = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$RemoteDir/")
    $checkReq.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)
    $checkReq.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $checkReq.UsePassive = $true
    $checkRes = $checkReq.GetResponse()
    $checkRes.Close()
} catch {
    $RemoteDir = ""
}

$displayDir = if ($RemoteDir) { $RemoteDir } else { "/" }
Write-Host "`n🌐 [3/3] Enviando arquivos via FTP para $FtpHost ($displayDir)..." -ForegroundColor Green

function Upload-FtpDirectory {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )

    $items = Get-ChildItem -Path $LocalPath
    foreach ($item in $items) {
        $targetRemote = if ($RemotePath -and $RemotePath -ne "/") { "$RemotePath/$($item.Name)" } else { "/$($item.Name)" }
        if ($item.PSIsContainer) {
            # Criar diretório remoto
            try {
                $dirUri = "ftp://$FtpHost$targetRemote"
                $req = [System.Net.FtpWebRequest]::Create($dirUri)
                $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)
                $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $req.UsePassive = $true
                $res = $req.GetResponse()
                $res.Close()
            } catch {
                # Diretório já existe
            }
            Upload-FtpDirectory -LocalPath $item.FullName -RemotePath $targetRemote
        } else {
            $rel = $item.FullName.Replace((Get-Location).Path, '')
            Write-Host "  -> Enviando: $rel" -ForegroundColor DarkGray
            try {
                $fileUri = "ftp://$FtpHost$targetRemote"
                $req = [System.Net.FtpWebRequest]::Create($fileUri)
                $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)
                $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
                $req.UseBinary = $true
                $req.UsePassive = $true

                $fileStream = [System.IO.File]::OpenRead($item.FullName)
                $ftpStream = $req.GetRequestStream()
                $fileStream.CopyTo($ftpStream)
                $ftpStream.Close()
                $fileStream.Close()
                $res = $req.GetResponse()
                $res.Close()
            } catch {
                Write-Host "⚠️ Erro ao enviar $($item.Name): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

Upload-FtpDirectory -LocalPath "hostinger" -RemotePath $RemoteDir

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO NA HOSTINGER!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
