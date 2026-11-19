# ==============================================================================
# DIAGNÓSTICO DE SAÚDE E CONECTIVIDADE DO SUPABASE STAGING (SOMENTE LEITURA)
# Projeto: wsologhmptielhhnbgob
# ==============================================================================

$url = "https://wsologhmptielhhnbgob.supabase.co"
$anonKey = "sb_publishable_32ornDuL47bgPozyI9Gr3Q_HKEgDN5K"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

Write-Host "=== 1. TESTE AUTH HEALTH COM APIKEY ==="
try {
    $resAuth = Invoke-RestMethod -Uri "$url/auth/v1/health" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Auth Health Response: $(ConvertTo-Json $resAuth -Compress)"
} catch {
    Write-Host "Erro no Auth Health: $_"
}

Write-Host "`n=== 2. TESTE REALTIME HEALTH / WEBSOCKET COM APIKEY ==="
try {
    $resRealtime = Invoke-WebRequest -Uri "$url/realtime/v1/health" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Realtime Health Status: $($resRealtime.StatusCode)"
    Write-Host "Realtime Health Body: $($resRealtime.Content)"
} catch {
    Write-Host "Realtime Health retorno: $_"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}

Write-Host "`n=== 3. TESTE REST ROOT API (OPENAPI SPEC / SCHEMAS) ==="
try {
    $resRest = Invoke-WebRequest -Uri "$url/rest/v1/?apikey=$anonKey" -Method Get -TimeoutSec 10
    Write-Host "REST Root Status: $($resRest.StatusCode)"
    Write-Host "REST Content Length: $($resRest.Content.Length) bytes"
} catch {
    Write-Host "REST Root retorno: $_"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}
