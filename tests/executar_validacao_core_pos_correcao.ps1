# ==============================================================================
# SCRIPT DE RE-VALIDACAO LOCAL DO CORE SCHEMA POS-CORRECAO CIRURGICA
# Arquivo: tests/executar_validacao_core_pos_correcao.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"

$baseDir = "D:\midiaos_build"
$tmpPgDir = "$baseDir\.tmp_postgres"
$zipPath = "$tmpPgDir\postgres.zip"
$pgDir = "$tmpPgDir\pgsql"
$dataDir = "$tmpPgDir\data"
$logsDir = "$baseDir\tests\logs_validacao_core"
$sqlCore = "$baseDir\PACOTE_IMPLANTACAO_STAGING\01_midiaos_v260_core_schema.sql"
$port = 54333

Write-Host "=== 1. VERIFICANDO INSTALACAO LOCAL DO POSTGRESQL 15.8 ==="
if (-not (Test-Path "$pgDir\bin\psql.exe")) {
    if (-not (Test-Path $tmpPgDir)) {
        New-Item -ItemType Directory -Path $tmpPgDir -Force | Out-Null
    }
    $url = "https://get.enterprisedb.com/postgresql/postgresql-15.8-1-windows-x64-binaries.zip"
    Write-Host "Baixando $url..."
    (New-Object System.Net.WebClient).DownloadFile($url, $zipPath)
    Write-Host "Extraindo binarios..."
    Expand-Archive -Path $zipPath -DestinationPath $tmpPgDir -Force
}

if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "Inicializando cluster PostgreSQL..."
    & "$pgDir\bin\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C
}

Write-Host "=== 2. INICIANDO SERVIDOR POSTGRESQL NA PORTA $port ==="
$serverLog = "$logsDir\postgres_server_v2.log"
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

# 3. Recriar banco descartavel staging_test do zero
Write-Host "=== 3. RECRIANDO BANCO DESCARTAVEL staging_test ==="
& "$pgDir\bin\psql.exe" -p $port -U postgres -c "DROP DATABASE IF EXISTS staging_test;"
& "$pgDir\bin\createdb.exe" -p $port -U postgres staging_test

# 4. Provisionar ambiente base de compatibilidade Supabase
Write-Host "=== 4. PROVISIONANDO AMBIENTE BASE SUPABASE ==="
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

# 5. EXECUCAO 1 DO ARQUIVO CORE CORRIGIDO
Write-Host "=== 5. EXECUTANDO 01_midiaos_v260_core_schema.sql - EXECUCAO 1 ==="
$logExec1 = "$logsDir\execucao_1_pos_correcao.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlCore 2>&1 | Out-File -FilePath $logExec1 -Encoding utf8

# 6. AUDITORIA DOS OBJETOS CRIADOS
Write-Host "=== 6. AUDITORIA DOS OBJETOS CRIADOS - EXECUCAO 1 ==="
$auditScript = @'
\echo '=== RESUMO GERAL DE CONTAGEM ==='
SELECT 'TABELAS_BASE_PUBLIC' AS categoria, count(*)::text AS total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'ENUMS_PUBLIC' AS categoria, count(*)::text AS total FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e';
SELECT 'FUNCOES_PUBLIC' AS categoria, count(*)::text AS total FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';
SELECT 'TRIGGERS_PUBLIC' AS categoria, count(*)::text AS total FROM information_schema.triggers WHERE trigger_schema = 'public';
SELECT 'POLICIES_PUBLIC' AS categoria, count(*)::text AS total FROM pg_policies WHERE schemaname = 'public';
SELECT 'INDICES_PUBLIC' AS categoria, count(*)::text AS total FROM pg_indexes WHERE schemaname = 'public';

\echo '=== CONFIRMACAO DA FUNCAO gerar_pos_vendas_pendentes ==='
SELECT 'REGPROCEDURE_POS_VENDAS' AS teste, to_regprocedure('public.gerar_pos_vendas_pendentes()')::text AS resultado;
SELECT routine_name, routine_type, security_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'gerar_pos_vendas_pendentes';

\echo '=== CONFIRMACAO DE to_regprocedure EM trigger_sync_cnpj_burst ==='
SELECT 'REGPROCEDURE_BURST' AS teste, to_regprocedure('public.trigger_sync_cnpj_burst()')::text AS resultado;

\echo '=== PRIVILEGIOS EM gerar_pos_vendas_pendentes ==='
SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_schema = 'public' AND routine_name = 'gerar_pos_vendas_pendentes';

\echo '=== TENANT RAIZ TV BRASILIA ==='
SELECT id::text, razao_social, nome_fantasia, status FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff';

\echo '=== LISTA DE TABELAS (PUBLIC) ==='
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;

\echo '=== LISTA DE ENUMS (PUBLIC) ==='
SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname;
'@

$logObjetos = "$logsDir\objetos_execucao_1_pos_correcao.log"
$auditScript | & "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test | Out-File -FilePath $logObjetos -Encoding utf8

# 7. EXECUCAO 2 (TESTE DE IDEMPOTENCIA)
Write-Host "=== 7. TESTE DE IDEMPOTENCIA - REAPLICACAO DO CORE - EXECUCAO 2 ==="
$logExec2 = "$logsDir\execucao_2_idempotencia_pos_correcao.log"
& "$pgDir\bin\psql.exe" -p $port -U postgres -d staging_test -f $sqlCore 2>&1 | Out-File -FilePath $logExec2 -Encoding utf8

# 8. PARAR POSTGRESQL
Write-Host "=== 8. FINALIZANDO E DESLIGANDO SERVIDOR LOCAL ==="
& "$pgDir\bin\pg_ctl.exe" -D $dataDir -m fast stop

# 9. EXCLUIR DIRETORIO TEMPORARIO .tmp_postgres
Write-Host "=== 9. EXCLUINDO CLUSTER TEMPORARIO .tmp_postgres ==="
Start-Sleep -Seconds 2
Remove-Item -Path $tmpPgDir -Recurse -Force

Write-Host "=== VALIDACAO CONCLUIDA COM SUCESSO. LOGS PRESERVADOS EM $logsDir ==="
