param (
    [string]$FtpHost,
    [string]$FtpUser,
    [string]$FtpPass,
    [string]$RemoteDir = "/public_html"
)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DEPLOY AUTOMÁTICO PARA A HOSTINGER" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Ler do .env caso não tenha sido passado por parâmetro
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*HOSTINGER_FTP_HOST\s*=\s*['""]?(.*?)['""]?\s*$") { $FtpHost = if (-not $FtpHost) { $matches[1] } else { $FtpHost } }
        if ($_ -match "^\s*HOSTINGER_FTP_USER\s*=\s*['""]?(.*?)['""]?\s*$") { $FtpUser = if (-not $FtpUser) { $matches[1] } else { $FtpUser } }
        if ($_ -match "^\s*HOSTINGER_FTP_PASS\s*=\s*['""]?(.*?)['""]?\s*$") { $FtpPass = if (-not $FtpPass) { $matches[1] } else { $FtpPass } }
    }
}

if (-not $FtpHost -or -not $FtpUser -or -not $FtpPass) {
    Write-Host "❌ Credenciais de FTP não encontradas!" -ForegroundColor Red
    Write-Host "Configure as seguintes variáveis no seu arquivo .env:" -ForegroundColor Yellow
    Write-Host "HOSTINGER_FTP_HOST=seu-servidor-ftp-hostinger" -ForegroundColor Gray
    Write-Host "HOSTINGER_FTP_USER=seu-usuario-ftp" -ForegroundColor Gray
    Write-Host "HOSTINGER_FTP_PASS=sua-senha-ftp" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ou execute passando os parâmetros:" -ForegroundColor Yellow
    Write-Host ".\scripts\deploy-hostinger.ps1 -FtpHost 'ftp.exemplo.com' -FtpUser 'user' -FtpPass 'pass'" -ForegroundColor Gray
    exit 1
}

Write-Host "`n📦 [1/3] Compilando a aplicação..." -ForegroundColor Green
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha na compilação!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📁 [2/3] Organizando arquivos na pasta 'hostinger'..." -ForegroundColor Green
if (-not (Test-Path "hostinger")) { New-Item -ItemType Directory -Path "hostinger" -Force | Out-Null }
Copy-Item -Path ".output" -Destination "hostinger\.output" -Recurse -Force
Copy-Item -Path "hostinger.mjs" -Destination "hostinger\hostinger.mjs" -Force
Copy-Item -Path "package.json" -Destination "hostinger\package.json" -Force

Write-Host "`n🌐 [3/3] Enviando arquivos via FTP para $FtpHost ($RemoteDir)..." -ForegroundColor Green

function Upload-FtpDirectory {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )

    $items = Get-ChildItem -Path $LocalPath
    foreach ($item in $items) {
        $targetRemote = "$RemotePath/$($item.Name)"
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
            Write-Host "  -> Enviando: $($item.FullName.Replace((Get-Location).Path, ''))" -ForegroundColor DarkGray
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
