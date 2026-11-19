# ==============================================================================
# SCRIPT DE RE-VALIDACAO LOCAL EM TRES PARTES SEQUENCIAIS
# Arquivo: tests/executar_validacao_tres_partes_local.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"

$baseDir = "D:\midiaos_build"
$tmpPgDir = "$baseDir\.tmp_postgres"
$zipPath = "$tmpPgDir\postgres.zip"
$pgDir = "$tmpPgDir\pgsql"
$dataDir = "$tmpPgDir\data"
$logsDir = "$baseDir\tests\logs_validacao_core"
$sqlP1 = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01A_midiaos_v260_core_parte1.sql"
$sqlP2 = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01B_midiaos_v260_core_parte2.sql"
$sqlP3 = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01C_midiaos_v260_core_parte3.sql"
$sqlDiag = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01_diagnostico_pos_execucao_core.sql"
$port = 54333

Write-Host "=== 1. PREPARANDO DIRETORIO TEMPORARIO E BAIXANDO POSTGRESQL 15.8 ==="
if (-not (Test-Path "$pgDir\bin\psql.exe")) {
    if (-not (Test-Path $tmpPgDir)) {
        New-Item -ItemType Directory -Path $tmpPgDir -Force | Out-Null
    }
    $url = "https://get.enterprisedb.com/postgresql/postgresql-15.8-1-windows-x64-binaries.zip"
    $expectedHash = "6FA01FBF08AACA7D1B00284CE6534932EE5D7D545678615AFF12365EFACF935D"
    Write-Host "Baixando $url..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    (New-Object System.Net.WebClient).DownloadFile($url, $zipPath)
    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $zipPath).Hash
    Write-Host "SHA-256 verificado: $actualHash"
    if ($actualHash -ne $expectedHash) {
        Write-Error "Hash SHA-256 do arquivo baixado ($actualHash) nao confere com o esperado ($expectedHash)!"
        exit 1
    }
    Write-Host "Extraindo binarios..."
    Expand-Archive -Path $zipPath -DestinationPath $tmpPgDir -Force
}

if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "=== 2. INICIALIZANDO CLUSTER POSTGRESQL 15.8 ==="
    & "$pgDir\bin\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C
}

Write-Host "=== 3. INICIANDO SERVIDOR POSTGRESQL NA PORTA $port ==="
$serverLog = "$logsDir\postgres_server_tres_partes.log"
& "$pgDir\bin\pg_ctl.exe" -D $dataDir -l $serverLog -o "-p $port" start

# Aguardar pg_isready
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    & "$pgDir\bin\pg_isready.exe" -p $port -q
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        Write-Host "PostgreSQL esta pronto para conexoes na porta $port."
        break
    }
}

if (-not $ready) {
    Write-Error "PostgreSQL nao iniciou a tempo. Verifique $serverLog"
    exit 1
}

# 4. Criar banco descartavel staging_test
Write-Host "=== 4. RECRIANDO BANCO DESCARTAVEL staging_test ==="
& "$pgDir\bin\psql.exe" -p $port -U postgres -c "DROP DATABASE IF EXISTS staging_test;"
& "$pgDir\bin\createdb.exe" -p $port -U postgres staging_test

# 5. Provisionar ambiente base de compatibilidade Supabase
Write-Host "=== 5. PROVISIONANDO AMBIENTE BASE SUPABASE ==="
$preScript = @'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT 'a711a129-330c-46bf-943a-531cedd4f2ff'::uuid; $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text; $$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE PUBLICATION supabase_realtime;

CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic text NOT NULL,
  extension text NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'notif'::text; $$;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[]
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN string_to_array(name, '/'); END; $$;
CREATE OR REPLACE FUNCTION storage.filename(name text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN split_part(name, '/', array_length(string_to_array(name, '/'), 1)); END; $$;
CREATE OR REPLACE FUNCTION storage.extension(name text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN split_part(name, '.', 2); END; $$;
'@

$preScript | & "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -q

# 6. EXECUCAO PARTE 1
Write-Host "=== 6. EXECUTANDO 01A_midiaos_v260_core_parte1.sql ==="
$logP1 = "$logsDir\execucao_parte1.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlP1 2>&1 | Out-File -FilePath $logP1 -Encoding utf8
Write-Host "Parte 1 concluida."

# 7. EXECUCAO PARTE 2
Write-Host "=== 7. EXECUTANDO 01B_midiaos_v260_core_parte2.sql ==="
$logP2 = "$logsDir\execucao_parte2.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlP2 2>&1 | Out-File -FilePath $logP2 -Encoding utf8
Write-Host "Parte 2 concluida."

# 8. EXECUCAO PARTE 3
Write-Host "=== 8. EXECUTANDO 01C_midiaos_v260_core_parte3.sql ==="
$logP3 = "$logsDir\execucao_parte3.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlP3 2>&1 | Out-File -FilePath $logP3 -Encoding utf8
Write-Host "Parte 3 concluida."

# 9. EXECUCAO DO DIAGNOSTICO FINAL
Write-Host "=== 9. EXECUTANDO DIAGNOSTICO FINAL DE OBJETOS ==="
$logDiag = "$logsDir\diagnostico_pos_tres_partes.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlDiag 2>&1 | Out-File -FilePath $logDiag -Encoding utf8

# 10. PARAR POSTGRESQL
Write-Host "=== 10. FINALIZANDO E DESLIGANDO SERVIDOR LOCAL ==="
& "$pgDir\bin\pg_ctl.exe" -D $dataDir -m fast stop

# 11. EXCLUIR CLUSTER TEMPORARIO .tmp_postgres
Write-Host "=== 11. EXCLUINDO CLUSTER TEMPORARIO .tmp_postgres ==="
Start-Sleep -Seconds 2
Remove-Item -Path $tmpPgDir -Recurse -Force

Write-Host "=== VALIDACAO DAS TRES PARTES CONCLUIDA COM SUCESSO. ==="

